import Auths from "@/components/Auths";
import { SignIn } from "@clerk/nextjs";

const SignInPage = () => {
  return (
    <main className="flex h-screen w-full">
      {/* Animated Side */}
      <Auths />

      {/* Sign In */}
      <div className="flex w-full items-center justify-center md:w-1/2">
        <SignIn />
      </div>
    </main>
  );
};

export default SignInPage;
