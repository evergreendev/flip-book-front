"use client"

import { useState } from "react"
import { Copy, Check, Code } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface EmbedDialogProps {
  id: string
  pathName: string | null
}

export function EmbedDialog({ id, pathName }: EmbedDialogProps) {
  const [copied, setCopied] = useState(false)
  const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
  const embedUrl = `${baseUrl}/${pathName || id}`
  const iframeCode = `<iframe src="${embedUrl}" width="100%" height="900px" frameborder="0" allowfullscreen></iframe>`

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(iframeCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy!", err)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          title="Embed Code"
          className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full p-2"
        >
          <Code className="h-5 w-5" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>Embed Flipbook</DialogTitle>
          <DialogDescription>
            Copy the code below to embed this flipbook into your website.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-4">
          <div className="relative">
            <pre className="p-4 bg-gray-50 border rounded-md text-xs font-mono break-all whitespace-pre-wrap">
              {iframeCode}
            </pre>
            <Button
              size="sm"
              variant="outline"
              className="absolute top-2 right-2 h-8 w-8 p-0"
              onClick={copyToClipboard}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              <span className="sr-only">Copy</span>
            </Button>
          </div>
          <div className="flex justify-end">
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Close
              </Button>
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
