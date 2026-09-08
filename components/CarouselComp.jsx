"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

import { Separator } from "./ui/separator";
import { Button } from "@/components/ui/button";

export default function CarouselComp({
  dataList,
  handleShortlist,
  shortlistStatus,
}) {
  const getQuestions = (data) => {
    if (!data?.Questions) return [];

    if (Array.isArray(data.Questions)) {
      return data.Questions;
    }

    if (typeof data.Questions === "object") {
      return Object.entries(data.Questions);
    }

    return [];
  };

  return (
    <Carousel className="max-w-full">
      <CarouselContent>
        {dataList.map((data, index) => {
          const questions = getQuestions(data);

          return (
            <CarouselItem key={data._id || data.id || index}>
              <div className="p-1">
                <Card className="h-[55vh] max-h-[55vh] border-none shadow-none overflow-hidden">
                  <CardContent className="flex h-full flex-col p-3 overflow-hidden">
                    <div className="flex flex-col items-center justify-center mb-3 gap-1 font-medium shrink-0">
                      <span>{data.Name || "Unnamed Applicant"}</span>
                      <span className="font-light text-sm opacity-[50%]">
                        {data.Department || "No Department"}
                      </span>
                    </div>
                    <div className="w-full flex-1 flex flex-col gap-5 overflow-y-auto pr-1">
                      {questions.length > 0 ? (
                        questions.map((item, qIndex) => {
                          const question = Array.isArray(item)
                            ? item[0]
                            : item?.question;

                          const answer = Array.isArray(item)
                            ? item[1]
                            : item?.answer;

                          return (
                            <div
                              key={item?.id || `${question}-${qIndex}`}
                              className="mb-4"
                            >
                              <p className="font-medium text-gray-900">
                                {question}
                              </p>

                              <p className="mt-1 text-gray-600">
                                {answer || "No answer provided"}
                              </p>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-sm text-gray-400">
                          No responses available for this applicant.
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={() => handleShortlist(index)}
                      className={`text-white rounded-md mt-4 shrink-0 ${
                        shortlistStatus[index]
                          ? "bg-red-600 hover:bg-red-700"
                          : "bg-green-600 hover:bg-green-700"
                      }`}
                    >
                      {shortlistStatus[index]
                        ? "Unshortlist Applicant"
                        : "Shortlist Applicant"}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          );
        })}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
}
