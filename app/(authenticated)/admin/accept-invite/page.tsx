import { auth } from "@/auth"
import { prisma } from "@/lib/db/prisma"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GoogleSignInButton } from "./google-sign-in-button"

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const params = await searchParams
  const session = await auth()

  // If already signed in, check if their role was updated
  if (session?.user) {
    const role = session.user.role
    if (role === "admin" || role === "editor") {
      redirect("/admin")
    }

    // Check if there's a pending invite for this user
    const email = session.user.email?.toLowerCase()
    if (email) {
      const invite = await prisma.adminInvite.findUnique({
        where: { email },
      })
      if (invite && !invite.usedAt) {
        // Mark invite as used and update role
        await prisma.$transaction([
          prisma.user.update({
            where: { id: session.user.id },
            data: { role: invite.role },
          }),
          prisma.adminInvite.update({
            where: { id: invite.id },
            data: { usedAt: new Date() },
          }),
        ])
        redirect("/admin")
      }
    }

    // No valid invite found
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>No Invite Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              There is no pending invite for <strong>{session.user.email}</strong>.
              Please ask an admin to send you an invite.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Not signed in — show Google sign-in button
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Accept Your Invite</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Sign in with Google to accept your admin invite and join the VibeShop team.
          </p>
          <GoogleSignInButton />
        </CardContent>
      </Card>
    </div>
  )
}
