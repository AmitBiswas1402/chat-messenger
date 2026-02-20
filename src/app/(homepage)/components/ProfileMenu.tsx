"use client";

import { UserButton, useUser } from "@clerk/nextjs";

export default function ProfileMenu() {
  const { user } = useUser();

  return (
    <div className="flex items-center gap-3">
      <UserButton
        appearance={{
          elements: {
            avatarBox: "w-10 h-10",
          },
        }}
      />
      <div className="text-sm">
        <p className="font-medium">{user?.fullName}</p>
        <p className="text-xs text-muted-foreground">
          {user?.primaryEmailAddress?.emailAddress}
        </p>
      </div>
    </div>
  );
}
