"use client"
import { signIn, signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
export default function Home() {
   const { data: session,  } = useSession();
  return (

    <div className="">

<button className="p-3 bg-sky-500 hover:bg-sky-700" onClick={() => signIn()}>
  Signin
</button>
    HI
    {session?.user ? <>{session?.user?.name ?? "No user name found"}
    <button className="p-3 bg-sky-500 hover:bg-sky-700" onClick={()=>signOut({ callbackUrl: 'http://localhost:3000' })}>
      signout
    </button>
</>:<>
    
  <div>Not logged in</div>
    </>
    }
    </div>
  );
}
