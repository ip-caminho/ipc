"use client"

import * as React from "react"

import { cn } from "@/shared/lib/utils/cn"
import { useIsMobile } from "@/shared/hooks/use-mobile"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/shared/components/ui/drawer"

type ResponsiveDialogContextValue = { isMobile: boolean }

const ResponsiveDialogContext =
  React.createContext<ResponsiveDialogContextValue | null>(null)

function useResponsiveDialogContext() {
  const ctx = React.useContext(ResponsiveDialogContext)
  if (!ctx) {
    throw new Error(
      "ResponsiveDialog components must be used within <ResponsiveDialog>",
    )
  }
  return ctx
}

function ResponsiveDialog({
  children,
  ...props
}: React.ComponentProps<typeof Dialog>) {
  const isMobile = useIsMobile()
  const Root = isMobile ? Drawer : Dialog
  return (
    <ResponsiveDialogContext.Provider value={{ isMobile }}>
      <Root {...props}>{children}</Root>
    </ResponsiveDialogContext.Provider>
  )
}

function ResponsiveDialogTrigger(
  props: React.ComponentProps<typeof DialogTrigger>,
) {
  const { isMobile } = useResponsiveDialogContext()
  const Trigger = isMobile ? DrawerTrigger : DialogTrigger
  return <Trigger {...props} />
}

function ResponsiveDialogClose(
  props: React.ComponentProps<typeof DialogClose>,
) {
  const { isMobile } = useResponsiveDialogContext()
  const Close = isMobile ? DrawerClose : DialogClose
  return <Close {...props} />
}

type ResponsiveDialogContentProps = React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}

function ResponsiveDialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: ResponsiveDialogContentProps) {
  const { isMobile } = useResponsiveDialogContext()
  if (isMobile) {
    return (
      <DrawerContent
        className={cn("flex max-h-[92dvh] flex-col", className)}
        {...props}
      >
        {children}
      </DrawerContent>
    )
  }
  return (
    <DialogContent
      showCloseButton={showCloseButton}
      className={cn(
        "flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg",
        className,
      )}
      {...props}
    >
      {children}
    </DialogContent>
  )
}

function ResponsiveDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { isMobile } = useResponsiveDialogContext()
  const Header = isMobile ? DrawerHeader : DialogHeader
  return (
    <Header
      className={cn(
        "shrink-0 border-b px-4 pt-4 pb-3 md:px-6 md:pt-5 md:pb-4",
        className,
      )}
      {...props}
    />
  )
}

function ResponsiveDialogBody({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="responsive-dialog-body"
      className={cn(
        "flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5",
        className,
      )}
      {...props}
    />
  )
}

function ResponsiveDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { isMobile } = useResponsiveDialogContext()
  if (isMobile) {
    return (
      <DrawerFooter
        className={cn(
          "shrink-0 flex-col-reverse gap-2 border-t px-4 py-3 pb-safe sm:flex-row sm:justify-end",
          className,
        )}
        {...props}
      />
    )
  }
  return (
    <DialogFooter
      className={cn("shrink-0 border-t px-6 py-4", className)}
      {...props}
    />
  )
}

function ResponsiveDialogTitle(
  props: React.ComponentProps<typeof DialogTitle>,
) {
  const { isMobile } = useResponsiveDialogContext()
  const Title = isMobile ? DrawerTitle : DialogTitle
  return <Title {...props} />
}

function ResponsiveDialogDescription(
  props: React.ComponentProps<typeof DialogDescription>,
) {
  const { isMobile } = useResponsiveDialogContext()
  const Description = isMobile ? DrawerDescription : DialogDescription
  return <Description {...props} />
}

export {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
}
