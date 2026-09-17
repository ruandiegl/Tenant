import dotenv from 'dotenv';
dotenv.config();
import fs from 'node:fs';
import path from 'node:path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;
const publicUrl = process.env.R2_PUBLIC_URL ? process.env.R2_PUBLIC_URL.replace(/\/+$/, '') : '';

if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
  console.error('Missing R2 environment variables in .env');
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey }
});

const mimeTypes = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif'
};

function getFilesRecursively(dir) {
  if (!fs.existsSync(dir)) return [];
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(filePath));
    } else {
      results.push(filePath);
    }
  }
  return results;
}

async function uploadFile(filePath, keyPrefix) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  const fileBuffer = fs.readFileSync(filePath);
  const normalizedKey = keyPrefix.replace(/\\/g, '/');

  console.log(`Uploading: ${normalizedKey} (${fileBuffer.length} bytes, ${contentType})...`);

  await s3.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: normalizedKey,
    Body: fileBuffer,
    ContentType: contentType
  }));

  const fullPublicUrl = `${publicUrl}/${normalizedKey}`;
  console.log(`   Uploaded -> ${fullPublicUrl}`);

  try {
    const testFetch = await fetch(fullPublicUrl);
    console.log(`   Verification: HTTP ${testFetch.status} ${testFetch.statusText}`);
  } catch (err) {
    console.warn(`   Verification warning: ${err.message}`);
  }

  return fullPublicUrl;
}

async function main() {
  console.log('=== INICIANDO MIGRACAO DE IMAGENS PARA CLOUDFLARE R2 ===');
  console.log('Bucket:', bucketName);
  console.log('Public URL:', publicUrl);

  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  const uploadedMap = new Map();

  if (fs.existsSync(uploadsDir)) {
    const uploadFiles = getFilesRecursively(uploadsDir);
    console.log(`\nEncontrados ${uploadFiles.length} arquivos na pasta uploads:`);
    for (const f of uploadFiles) {
      const relPath = path.relative(uploadsDir, f);
      const key = `uploads/${relPath.replace(/\\/g, '/')}`;
      const url = await uploadFile(f, key);
      const localUrlRef = `/uploads/${relPath.replace(/\\/g, '/')}`;
      uploadedMap.set(localUrlRef, url);
    }
  }

  const brandDir = path.resolve(process.cwd(), '../frontend/public');
  if (fs.existsSync(brandDir)) {
    const brandFiles = fs.readdirSync(brandDir).filter(f => /\.(svg|png|jpg|jpeg|webp)$/i.test(f));
    console.log(`\nEncontrados ${brandFiles.length} arquivos de marca em frontend/public:`);
    for (const f of brandFiles) {
      const fullPath = path.join(brandDir, f);
      const key = `brand/${f}`;
      await uploadFile(fullPath, key);
    }
  }

  console.log('\nAtualizando referencias no banco de dados...');
  for (const [localUrl, r2Url] of uploadedMap.entries()) {
    console.log(`Buscando referencias para ${localUrl}...`);

    const productsUpdated = await prisma.product.updateMany({
      where: { imageUrl: localUrl },
      data: { imageUrl: r2Url }
    });
    console.log(`   Produtos atualizados: ${productsUpdated.count}`);

    const productImagesUpdated = await prisma.productImage.updateMany({
      where: { url: localUrl },
      data: { url: r2Url }
    });
    console.log(`   Imagens de produtos atualizadas: ${productImagesUpdated.count}`);
  }

  console.log('\n=== MIGRACAO CONCLUIDA COM SUCESSO! ===');
}

main()
  .catch(err => {
    console.error('Erro na migracao:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
