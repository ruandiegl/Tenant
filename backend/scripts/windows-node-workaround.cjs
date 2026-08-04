// Node 24 on some Windows installations can fail in os.userInfo(), which tsx
// uses only to name its temporary directory. Supplying the Unix-style numeric
// identifier avoids that lookup in tsx and its worker processes.
if (process.platform === "win32" && typeof process.geteuid !== "function") {
  process.geteuid = () => 0;
}
