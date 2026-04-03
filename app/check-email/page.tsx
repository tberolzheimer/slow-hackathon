import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function CheckEmailPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-3xl text-foreground mb-4">
        Check your email
      </h1>
      <p className="text-lg text-muted-foreground max-w-md mb-8">
        We sent you a sign-in link. Click it to access your saved looks and style profile.
      </p>
      <Button variant="outline" asChild>
        <Link href="/">Continue Browsing</Link>
      </Button>
    </div>
  )
}
