import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

// ── Root ────────────────────────────────────────────
const Drawer = ({
  shouldScaleBackground = true,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root shouldScaleBackground={shouldScaleBackground} {...props} />
);
Drawer.displayName = "Drawer";

const DrawerTrigger = DrawerPrimitive.Trigger;
const DrawerPortal = DrawerPrimitive.Portal;
const DrawerClose = DrawerPrimitive.Close;

// ── Overlay ─────────────────────────────────────────
const DrawerOverlay = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/80", className)}
    {...props}
  />
));
DrawerOverlay.displayName = "DrawerOverlay";

// ── Content ─────────────────────────────────────────
const DrawerContent = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content> & {
    /** Direção — padrão "right" (lateral) */
    side?: "right" | "bottom" | "left";
  }
>(({ className, children, side = "right", ...props }, ref) => {
  const sideClasses: Record<string, string> = {
    right:
      "fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col border-l bg-background sm:max-w-xl md:max-w-2xl lg:max-w-3xl",
    left:
      "fixed inset-y-0 left-0 z-50 flex h-full w-full flex-col border-r bg-background sm:max-w-xl md:max-w-2xl lg:max-w-3xl",
    bottom:
      "fixed inset-x-0 bottom-0 z-50 flex max-h-[96vh] flex-col rounded-t-[10px] border-t bg-background",
  };

  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Content
        ref={ref}
        className={cn(sideClasses[side], className)}
        {...props}
      >
        {/* Handle (puxador) para bottom drawers */}
        {side === "bottom" && (
          <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />
        )}
        {/* Botão X de fechar para drawers laterais */}
        {side !== "bottom" && (
          <DrawerPrimitive.Close className="absolute right-4 top-4 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
            <X className="h-5 w-5" />
            <span className="sr-only">Fechar</span>
          </DrawerPrimitive.Close>
        )}
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
});
DrawerContent.displayName = "DrawerContent";

// ── Header ──────────────────────────────────────────
const DrawerHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col gap-1.5 border-b px-6 py-4",
      className,
    )}
    {...props}
  />
);
DrawerHeader.displayName = "DrawerHeader";

// ── Body (área de scroll) ───────────────────────────
const DrawerBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex-1 overflow-y-auto px-6 py-4", className)}
    {...props}
  />
);
DrawerBody.displayName = "DrawerBody";

// ── Footer ──────────────────────────────────────────
const DrawerFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse border-t px-6 py-4 sm:flex-row sm:justify-end sm:space-x-2",
      className,
    )}
    {...props}
  />
);
DrawerFooter.displayName = "DrawerFooter";

// ── Title ───────────────────────────────────────────
const DrawerTitle = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DrawerTitle.displayName = "DrawerTitle";

// ── Description ─────────────────────────────────────
const DrawerDescription = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DrawerDescription.displayName = "DrawerDescription";

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerClose,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
