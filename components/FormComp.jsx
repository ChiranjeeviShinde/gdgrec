import React, { useEffect, useMemo, useState } from "react";
import * as z from "zod";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "./ui/form";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { ChevronDown, Clock, Megaphone, UsersRound, X } from "lucide-react";
import { QuestionnaireData } from "@/constants";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import CountdownTimer from "./common/CountdownTimer";
import { useSubmissions } from "@/components/SubmissionsProvider";
import { Bricolage_Grotesque, Space_Grotesk } from "next/font/google";
import { Label } from "@/components/ui/label";

const normaliseQuestion = (question) =>
  typeof question === "string"
    ? { name: question, type: "generic", placeholder: "2-3 sentences" }
    : question;

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

const FormComp = ({ dept1, dept2, isLoading, setIsLoading }) => {
  // Use Better Auth's useSession hook directly
  const { data: session, isPending, error } = authClient.useSession();

  const user = session?.user;
  const isSignedIn = !!user;
  const isLoaded = !isPending;

  // Form lifecycle and input telemetry state
  const [isFormOpen, setIsFormOpen] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameInputVal, setNameInputVal] = useState("");
  const [regNumberInputVal, setRegNumberInputVal] = useState("");
  const [emailInputVal, setEmailInputVal] = useState("");
  const [phoneInputVal, setPhoneInputVal] = useState("");
  const [formCompletionPercentage, setFormCompletionPercentage] = useState(0);
  const [keyStrokeCounter, setKeyStrokeCounter] = useState(0);
  const [syncTick, setSyncTick] = useState(0);
  const [formScrollOffset, setFormScrollOffset] = useState(0);

  const router = useRouter();
  const { submittedDepartments: contextSubmitted, markDepartmentsSubmitted } =
    useSubmissions();
  const [submittedDepartments, setSubmittedDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDraftReady, setIsDraftReady] = useState(false);
  const departmentNames = useMemo(
    () =>
      [dept1, dept2]
        .filter(Boolean)
        .map((department) =>
          typeof department === "string" ? department : department.name,
        ),
    [dept1, dept2],
  );
  const draftKey =
    user?.email && departmentNames.length
      ? `recruitment-draft:${user.email}:${[...departmentNames].sort().join("|")}`
      : null;

  // Track scroll depth within form container
  useEffect(() => {
    const handleScroll = () => {
      setFormScrollOffset(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Check application count when user is loaded
  useEffect(() => {
    if (user) {
      const userEmail = user.email;
      checkApplicationCount(userEmail);
    }
  }, [user]);

  // Function to check application count
  async function checkApplicationCount(userEmail) {
    const checkResponse = await fetch(
      `/api/check-applications?email=${userEmail}`,
    );
    const { count } = await checkResponse.json();
    console.log(count);

    if (count >= 2) {
      setErrorMessage(
        "Remember that you can only submit upto 2 unique applications",
      );
      setIsSubmitting(false);
      return;
    }
  }

  const normalizeDeptName = (str) =>
    str
      ? str
          .trim()
          .toLowerCase()
          .replace(/\s*\/\s*/g, "/")
      : "";

  const questionData = useMemo(
    () => [
      ...new Set(
        departmentNames.flatMap((department) =>
          (
            QuestionnaireData.find(
              (item) =>
                normalizeDeptName(item.department) ===
                normalizeDeptName(department),
            )?.questions ?? []
          )
            .map(normaliseQuestion)
            .map((question) => question.name),
        ),
      ),
    ],
    [departmentNames],
  );

  const schemaObj = {
    Name: z.string().min(1, "Name is required"),
    RegistrationNumber: z
      .string()
      .min(1, "Registration number is required")
      .regex(
        /^\d{2}[A-Z]{3}\d{4}$/,
        "Registration number must be 2 numbers, 3 uppercase letters, and 4 numbers (e.g. 25BCE5612)",
      ),
    Email: z.string(),
    Phone: z
      .string()
      .min(1, "Phone is required")
      .regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
    "Year of Study": z.string().optional(),
    Gender: z.string().min(1, "Gender is required"),
  };

  questionData.forEach((qd) => {
    schemaObj[qd] = z.string().optional();
  });

  const formSchema = z.object(schemaObj);
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      Name: "",
      RegistrationNumber: "",
      Email: "",
      Phone: "",
    },
  });

  useEffect(() => {
    if (!isLoaded || !user || !draftKey) return;

    const email = user.email;
    let isActive = true;
    setIsDraftReady(false);

    try {
      const savedDraft = JSON.parse(localStorage.getItem(draftKey) || "{}");
      form.reset({ ...form.getValues(), ...savedDraft.values, Email: email });
    } catch {
      form.setValue("Email", email);
    }

    async function initialiseForm() {
      const savedDraft = JSON.parse(localStorage.getItem(draftKey) || "{}");
      let remoteSubmitted = contextSubmitted || [];

      if (!remoteSubmitted.length) {
        const cacheKey = `submitted_depts_${email}`;
        const cached =
          typeof window !== "undefined"
            ? sessionStorage.getItem(cacheKey)
            : null;

        if (cached) {
          try {
            remoteSubmitted = JSON.parse(cached);
          } catch {}
        } else {
          try {
            const response = await fetch(
              `/api/check-applications?email=${encodeURIComponent(email)}`,
            );
            const result = await response.json();
            if (result?.submittedDepartments) {
              remoteSubmitted = result.submittedDepartments;
              if (typeof window !== "undefined") {
                sessionStorage.setItem(
                  cacheKey,
                  JSON.stringify(remoteSubmitted),
                );
              }
            }
          } catch (err) {
            console.error("Failed to check applications:", err);
          }
        }
      }

      if (!isActive) return;
      const completed = [
        ...new Set([
          ...(savedDraft.submittedDepartments || []),
          ...remoteSubmitted,
        ]),
      ];
      setSubmittedDepartments(completed);
      if (
        departmentNames.length > 0 &&
        departmentNames.every((dept) => completed.includes(dept))
      ) {
        setErrorMessage(
          `You have already submitted an application for ${departmentNames.join(" and ")}.`,
        );
      }
      localStorage.setItem(
        draftKey,
        JSON.stringify({
          values: form.getValues(),
          submittedDepartments: completed,
        }),
      );
      setLoading(false);
      setIsDraftReady(true);
    }

    initialiseForm().catch(() => {
      if (isActive) {
        setLoading(false);
        setIsDraftReady(true);
      }
    });

    return () => {
      isActive = false;
    };
  }, [contextSubmitted, departmentNames, draftKey, form, isLoaded, user]);

  const watchedValues = useWatch({ control: form.control });

  useEffect(() => {
    if (!isDraftReady || !draftKey) return;
    localStorage.setItem(
      draftKey,
      JSON.stringify({ values: watchedValues, submittedDepartments }),
    );
  }, [draftKey, isDraftReady, submittedDepartments, watchedValues]);

  // Check if user is authenticated
  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <span className="mx-auto mb-4 block h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] m-10">
        <div className="text-center">
          <p className="text-2xl font-semibold text-white mb-4">
            Sign In Required
          </p>
          <p className="text-lg text-gray-300 mb-6">
            Please sign in to access the application form.
          </p>
          <Button
            onClick={() => router.push("/auth/signin")}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  // User is authenticated
  const userEmail = user?.email;

  const handleSubmit = async (values) => {
    setIsSubmitting(true);
    setErrorMessage("");

    const pendingDepartments = departmentNames.filter(
      (department) => !submittedDepartments.includes(department),
    );

    if (!pendingDepartments.length) {
      toast.success("Your applications have already been submitted.");
      setIsSubmitting(false);
      router.push("/departments");
      return;
    }

    const basicDetails = {
      Name: values.Name,
      RegistrationNumber: values.RegistrationNumber,
      Phone: values.Phone,
      Gender: values.Gender,
      "Year of Study": values["Year of Study"],
    };

    const submitDepartment = async (department) => {
      const questions = (
        QuestionnaireData.find(
          (item) =>
            normalizeDeptName(item.department) ===
            normalizeDeptName(department),
        )?.questions ?? []
      ).map(normaliseQuestion);

      const response = await fetch("/api/submit-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...basicDetails,
          Department: department,
          Questions: questions.map((question, index) => ({
            id: `${department}-q${index + 1}`,
            question: question.name,
            answer: values[question.name] || "",
          })),
        }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `Could not submit ${department}.`);
      }
      return { department, success: true };
    };

    try {
      const results = await Promise.allSettled(
        pendingDepartments.map(submitDepartment),
      );
      const successful = results
        .filter(
          (result) => result.status === "fulfilled" && result.value.success,
        )
        .map((result) => result.value.department);
      const failed = results.flatMap((result, index) =>
        result.status === "rejected" ? [pendingDepartments[index]] : [],
      );
      const completed = [...new Set([...submittedDepartments, ...successful])];

      setSubmittedDepartments(completed);
      markDepartmentsSubmitted(completed);
      if (draftKey)
        localStorage.setItem(
          draftKey,
          JSON.stringify({ values, submittedDepartments: completed }),
        );
      if (typeof window !== "undefined" && values?.Email) {
        sessionStorage.setItem(
          `submitted_depts_${values.Email}`,
          JSON.stringify(completed),
        );
      }
      successful.forEach((department) =>
        toast.success(`Application submitted for ${department}.`),
      );

      if (failed.length) {
        setErrorMessage(
          `Submitted ${successful.length ? successful.join(", ") : "no applications"}. Please retry ${failed.join(", ")}.`,
        );
      } else {
        router.push("/departments");
      }
    } catch {
      setErrorMessage(
        "Your applications could not be submitted. Your saved answers will be kept for retrying.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <p>Checking your application status...</p>
      </div>
    );
  }

  if (!isFormOpen) {
    return (
      <div>
        <p>Recruitment Closed</p>
        <p>Recruitment has now been terminated.</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl">
        {errorMessage && !isSubmitting && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-600">{errorMessage}</p>

            <button
              type="button"
              onClick={() => router.push("/departments")}
              className="mt-3 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Go Back
            </button>
          </div>
        )}

        <div className="mb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
            Recruitment 2026
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Application Form
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Applying to:{" "}
            <span className="font-semibold text-zinc-900">
              {departmentNames.join(", ")}
            </span>
          </p>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-5"
          >
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Section 01
                </p>

                <h2 className="mt-1 text-xl font-semibold text-zinc-900">
                  About You
                </h2>
              </div>

              <div className="space-y-5">
                <FormField
                  control={form.control}
                  name="Name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-zinc-800">
                        Full Name
                      </FormLabel>

                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Jane Doe"
                          className="mt-1 h-12 rounded-lg border-zinc-300 bg-white px-4 text-sm shadow-none focus:border-black focus:ring-1 focus:ring-black"
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="RegistrationNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-zinc-800">
                        Registration Number
                      </FormLabel>

                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g. 25BCE5612"
                          className="mt-1 h-12 rounded-lg border-zinc-300 bg-white px-4 text-sm shadow-none focus:border-black focus:ring-1 focus:ring-black"
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="Gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-zinc-800">
                        Gender
                      </FormLabel>

                      <FormControl>
                        <select
                          {...field}
                          value={field.value || ""}
                          className="mt-1 h-12 w-full rounded-lg border border-zinc-300 bg-white px-4 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                        >
                          <option value="" disabled>
                            Select Gender
                          </option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                          <option value="Prefer not to say">
                            Prefer not to say
                          </option>
                        </select>
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="Email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-zinc-800">
                        Email Address
                      </FormLabel>

                      <FormControl>
                        <Input
                          {...field}
                          readOnly
                          type="email"
                          className="mt-1 h-12 rounded-lg border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-600 shadow-none"
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="Phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-zinc-800">
                        Phone (WhatsApp)
                      </FormLabel>

                      <FormControl>
                        <Input
                          {...field}
                          placeholder="+919876543210"
                          className="mt-1 h-12 rounded-lg border-zinc-300 bg-white px-4 text-sm shadow-none focus:border-black focus:ring-1 focus:ring-black"
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="Why do you want to join Organization Name?"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-zinc-800">
                        Why do you want to join Organization Name?
                      </FormLabel>

                      <FormControl>
                        <Textarea
                          {...field}
                          rows={4}
                          placeholder="2-3 Sentences"
                          className="mt-1 min-h-[130px] resize-none rounded-lg border-zinc-300 bg-white px-4 py-3 text-sm shadow-none focus:border-black focus:ring-1 focus:ring-black"
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            {renderDepartmentQuestions(
              departmentNames[0],
              QuestionnaireData,
              form,
            )}

            {departmentNames[1] &&
              renderDepartmentQuestions(
                departmentNames[1],
                QuestionnaireData,
                form,
              )}

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-12 rounded-lg bg-black px-7 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Submit Application"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </main>
  );
};

const renderDepartmentQuestions = (department, QuestionnaireData, form) => {
  const questions = (
    QuestionnaireData.find((qd) => qd.department === department)?.questions ??
    []
  )
    .map(normaliseQuestion)
    .filter(
      (question) =>
        question.name !== "Why do you want to join Organization Name?" &&
        question.name !== "Why do you want to join DWASFW?",
    );

  if (!questions.length) return null;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
      {/* Department heading */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Department
        </p>

        <h2 className="mt-1 text-xl font-semibold text-zinc-900">
          {department} Questions
        </h2>
      </div>

      <div className="space-y-5">
        {questions.map((question) => {
          const isCompact = question.type === "short-text";

          return (
            <div key={question.name}>
              <FormField
                control={form.control}
                name={question.name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-zinc-800">
                      {question.name}
                    </FormLabel>

                    <FormControl>
                      {isCompact ? (
                        <Input
                          {...field}
                          placeholder={question.placeholder || "Answer..."}
                          className="mt-1 h-12 rounded-lg border-zinc-300 bg-white px-4 text-sm shadow-none focus:border-black focus:ring-1 focus:ring-black"
                        />
                      ) : (
                        <Textarea
                          {...field}
                          rows={4}
                          placeholder={question.placeholder || "2-3 sentences"}
                          className="mt-1 min-h-[130px] resize-none rounded-lg border-zinc-300 bg-white px-4 py-3 text-sm shadow-none focus:border-black focus:ring-1 focus:ring-black"
                        />
                      )}
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default FormComp;
