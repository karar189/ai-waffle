"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Redirect to home with sign-up modal open. Auth is now shown as a modal. */
const SignUpPage = () => {
    const router = useRouter();
    useEffect(() => {
        router.replace("/?auth=signup");
    }, [router]);
    return null;
};

export default SignUpPage;
