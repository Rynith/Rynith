// components/ui/toast.tsx
"use client"

import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export const ToastProvider = ToastPrimitives.Provider

// ⬇️ Top-right on desktop; bottom on mobile
export const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      // mobile: bottom center; desktop: top-right
      "fixed z-[100] flex max-h-screen w-full max-w-[420px] flex-col gap-2 p-4",
      "bottom-0 left-1/2 -translate-x-1/2 sm:left-auto sm:right-4 sm:top-4 sm:bottom-auto sm:translate-x-0",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

// ⬇️ Add a brand stripe via :before; add a 'success' variant
const toastVariants = cva(
  [
    "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden",
    "rounded-xl border p-4 pr-10 shadow-lg ring-1 ring-black/5 transition-all",
    "data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]",
    "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none",
    "data-[state=open]:animate-in data-[state=closed]:animate-out",
    "data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full",
    "data-[state=open]:slide-in-from-bottom-full sm:data-[state=open]:slide-in-from-top-full",
    // brand stripe
    "before:content-[''] before:absolute before:left-0 before:top-0 before:h-full before:w-1",
    "before:bg-gradient-to-b before:from-[#6A0DAD] before:to-[#7B3AED]",
  ].join(" ")
  ,{
  variants: {
    variant: {
      default: "border-slate-200 bg-white text-slate-900",
      success: "border-emerald-200 bg-white text-slate-900 before:from-emerald-500 before:to-emerald-600",
      destructive:
        "border-red-200 bg-red-50 text-red-900 before:from-red-500 before:to-red-600",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

export const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => (
  <ToastPrimitives.Root
    ref={ref}
    className={cn(toastVariants({ variant }), className)}
    {...props}
  />
))
Toast.displayName = ToastPrimitives.Root.displayName

export const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border px-3 text-sm font-medium",
      "transition-colors ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
      // brand buttons
      "bg-white hover:bg-[#F3F0FF] border-[#6A0DAD] text-[#6A0DAD]",
      "group-[.destructive]:border-red-300 group-[.destructive]:hover:bg-red-100 group-[.destructive]:text-red-900",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

export const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity",
      "hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2",
      "group-hover:opacity-100",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

export const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

export const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm text-slate-700", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

export type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>
export type ToastActionElement = React.ReactElement<typeof ToastAction>
