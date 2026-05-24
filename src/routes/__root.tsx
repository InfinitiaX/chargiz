import { Outlet, Link, createRootRoute } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Chargiz" },
      { name: "description", content: "ChargiZ est une plateforme SaaS B2B permettant aux entreprises de suivre et rembourser les recharges de véhicules électriques de leurs collaborateurs." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Chargiz" },
      { property: "og:description", content: "ChargiZ est une plateforme SaaS B2B permettant aux entreprises de suivre et rembourser les recharges de véhicules électriques de leurs collaborateurs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Chargiz" },
      { name: "twitter:description", content: "ChargiZ est une plateforme SaaS B2B permettant aux entreprises de suivre et rembourser les recharges de véhicules électriques de leurs collaborateurs." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/fdcb66d8-1616-48e3-a25e-4b6b5ed46075/id-preview-b371c0b3--121d1309-7f1a-429b-b098-34f65246d35d.lovable.app-1776440230889.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/fdcb66d8-1616-48e3-a25e-4b6b5ed46075/id-preview-b371c0b3--121d1309-7f1a-429b-b098-34f65246d35d.lovable.app-1776440230889.png" },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootComponent() {
  return (
    <>
      <Outlet />
      <Toaster
        position="bottom-right"
        richColors
        toastOptions={{
          duration: 6000,
          classNames: {
            toast: "!rounded-xl !shadow-xl !border",
            title: "!font-semibold !text-sm",
            description: "!text-xs !leading-relaxed",
          },
        }}
      />
    </>
  );
}
