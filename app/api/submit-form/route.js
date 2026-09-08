import { NextResponse } from "next/server";
import { connect } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

const MAX_APPLICATIONS = 2;

export async function POST(req) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 },
      );
    }

    const user = session.user;

    const deadline = new Date("2026-12-31T23:59:59+05:30");

    if (new Date() > deadline) {
      return NextResponse.json(
        { message: "The submission deadline has passed" },
        { status: 403 },
      );
    }

    const body = await req.json();

    const {
      Department,
      Questions,
      Name,
      RegistrationNumber,
      Phone,
      ...otherFields
    } = body;

    if (!Department || typeof Department !== "string") {
      return NextResponse.json(
        { message: "Department is required" },
        { status: 400 },
      );
    }

    if (!Array.isArray(Questions)) {
      return NextResponse.json(
        { message: "Invalid question response format" },
        { status: 400 },
      );
    }

    const invalidQuestion = Questions.some(
      (question) =>
        !question ||
        typeof question.id !== "string" ||
        typeof question.question !== "string" ||
        typeof question.answer !== "string",
    );

    if (invalidQuestion) {
      return NextResponse.json(
        { message: "Invalid question response" },
        { status: 400 },
      );
    }

    const regNoRegex = /^\d{2}[A-Z]{3}\d{4}$/;

    if (!RegistrationNumber || !regNoRegex.test(RegistrationNumber)) {
      return NextResponse.json(
        {
          message:
            "Registration number must be 2 numbers, 3 uppercase letters, and 4 numbers (e.g. 25BCE5612)",
        },
        { status: 400 },
      );
    }

    if (!Phone || !/^\d{10}$/.test(Phone)) {
      return NextResponse.json(
        {
          message: "Phone number must be exactly 10 digits",
        },
        { status: 400 },
      );
    }
    const db = await connect();

    const collection = db.collection("formData");

    const userEmail = user.email;

    const applicationKey = Buffer.from(`${user.id}:${Department}`).toString(
      "base64url",
    );

    const applicationRef = collection.doc(applicationKey);

    const userLimitRef = db.collection("applicationLimits").doc(user.id);

    const application = {
      userId: user.id,
      Email: userEmail,
      Name,
      RegistrationNumber,
      Phone,
      ...otherFields,
      Department,
      Questions,
      shortlisted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    let applicationId;

    try {
      await db.runTransaction(async (transaction) => {
        const limitSnapshot = await transaction.get(userLimitRef);
        const applicationSnapshot = await transaction.get(applicationRef);

        if (applicationSnapshot.exists) {
          const error = new Error("ALREADY_SUBMITTED");
          throw error;
        }

        const currentCount = limitSnapshot.exists
          ? limitSnapshot.data()?.count || 0
          : 0;

        if (currentCount >= MAX_APPLICATIONS) {
          const error = new Error("APPLICATION_LIMIT");
          throw error;
        }

        transaction.set(applicationRef, application);

        transaction.set(
          userLimitRef,
          {
            count: currentCount + 1,
            updatedAt: new Date(),
          },
          { merge: true },
        );

        applicationId = applicationRef.id;
      });
    } catch (error) {
      if (error.message === "ALREADY_SUBMITTED") {
        return NextResponse.json(
          {
            message: `You have already submitted an application for ${Department}`,
          },
          { status: 409 },
        );
      }

      if (error.message === "APPLICATION_LIMIT") {
        return NextResponse.json(
          {
            message: "You can only submit up to 2 unique applications",
          },
          { status: 409 },
        );
      }

      throw error;
    }

    return NextResponse.json(
      {
        success: true,
        message: "Form submitted successfully!",
        applicationId,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Form submission error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Error submitting form",
      },
      { status: 500 },
    );
  }
}
