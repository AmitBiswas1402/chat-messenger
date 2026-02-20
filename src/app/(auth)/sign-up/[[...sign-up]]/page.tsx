import Auths from "@/components/Auths";
import { SignUp } from "@clerk/nextjs";

const SignUpPage = () => {
  return (
    <main className="flex h-screen w-full">
      {/* Animated Side */}
      <Auths />

      {/* Sign Up */}
      <div className="flex w-full items-center justify-center md:w-1/2">
        <SignUp />
      </div>
    </main>
  );
};

export default SignUpPage;
