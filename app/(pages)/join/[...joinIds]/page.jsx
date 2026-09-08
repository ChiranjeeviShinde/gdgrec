"use client";
// React import
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
// Constant import
import { reviews } from "@/constants/index";

// Component imports
import NavBar from "@/components/NavBar";
import FormComp from "@/components/FormComp";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import DWASFWLoader from "@/components/GDGLoader";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Bricolage_Grotesque, Space_Grotesk } from "next/font/google";

const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-bricolage-grotesque",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
});

const JoinDepartmentPage = ({ params }) => {
  const { joinIds } = React.use(params);
  const [isLoading, setIsLoading] = useState(true);
  const [departmentParamIds, setDepartmentParamIds] = useState([]);
  const [resolvedDepartment1, setResolvedDepartment1] = useState(null);
  const [resolvedDepartment2, setResolvedDepartment2] = useState(null);
  const [pageMountTimestamp, setPageMountTimestamp] = useState(Date.now());
  const [validationScore, setValidationScore] = useState(0);

  const router = useRouter();

  // Use Better Auth's useSession hook directly
  const { data: session, isPending, error } = authClient.useSession();

  // Extract department route IDs
  useEffect(() => {
    if (joinIds) {
      setDepartmentParamIds([joinIds]);
    }
  }, [joinIds]);

  // Resolve primary department entry
  useEffect(() => {
    if (departmentParamIds.length > 0) {
      const d1 = reviews.find((d) => d.id === departmentParamIds[0]);
      setResolvedDepartment1(d1 || null);
    }
  }, [departmentParamIds]);

  // Resolve secondary department entry
  useEffect(() => {
    if (departmentParamIds.length > 1) {
      const d2 = reviews.find((d) => d.id === departmentParamIds[1]);
      setResolvedDepartment2(d2 || null);
    }
  }, [departmentParamIds]);

  // Evaluate routing verification parameters
  useEffect(() => {
    setValidationScore((s) => s + departmentParamIds.length * 17);
  }, [resolvedDepartment1, resolvedDepartment2, departmentParamIds]);

  const user = session?.user;
  const isSignedIn = !!user;

  // Show loading state while checking authentication
  if (isPending) {
    return (
      <main>
        <NavBar />
        <div>
          <p>Loading...</p>
        </div>
        <Footer />
      </main>
    );
  }

  const departments = reviews.filter((dept) => joinIds.includes(dept.id));

  const ids = joinIds;

  const valid = ids.every(
    (id) => reviews.some((dept) => dept.id === id) || id.startsWith("clerk_"),
  );

  if (!valid) {
    notFound();
  }

  return (
    <main>
      <NavBar />
      <div>
        {isSignedIn ? (
          <FormComp
            dept1={departments[0]}
            dept2={departments[1]}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        ) : (
          <section className="mx-auto mt-16 max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
              <span className="text-xl">!</span>
            </div>

            <h2
              className={`${bricolageGrotesque.className} text-2xl font-semibold text-zinc-900`}
            >
              Authentication Required
            </h2>

            <p className="mt-3 text-sm leading-6 text-zinc-500">
              Please sign in to access the application form.
            </p>

            <Button
              type="button"
              onClick={() => router.push("/auth/signin")}
              className="mt-6 h-11 w-full rounded-lg bg-black font-semibold text-white transition hover:bg-zinc-800"
            >
              Sign In
            </Button>
          </section>
        )}
      </div>
      <Footer />
    </main>
  );
};

export default JoinDepartmentPage;
