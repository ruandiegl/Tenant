import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PropsWithChildren, useMemo } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider } from "./auth-provider";
import { CatalogProvider } from "./catalog-provider";
import { CustomerFlowProvider } from "./customer-flow-provider";
import { SocketProvider } from "./socket-provider";
import { TenantProvider } from "./tenant-provider";

export function AppProviders({ children }: PropsWithChildren) {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 30
          }
        }
      }),
    []
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TenantProvider>
        <AuthProvider>
          <CatalogProvider>
            <CustomerFlowProvider>
              <SocketProvider>{children}</SocketProvider>
            </CustomerFlowProvider>
          </CatalogProvider>
        </AuthProvider>
      </TenantProvider>
      <ToastContainer
        autoClose={3200}
        closeOnClick
        newestOnTop={false}
        pauseOnFocusLoss={false}
        position="bottom-right"
        theme="colored"
      />
    </QueryClientProvider>
  );
}
