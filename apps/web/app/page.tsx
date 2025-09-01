"use client"
import { signIn, signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
export default function Home() {
   const { data: session, status } = useSession();
  return (

    <div >

<button onClick={() => signIn()}>
  Signin
</button>
    HI
    {session?.user ? <>{session?.user?.name ?? "No user name found"}</>:<>
    <button onClick={()=>signOut}>
      signout
    </button>

  <div>Not logged in</div>
    </>
    }
    </div>
  );
}
