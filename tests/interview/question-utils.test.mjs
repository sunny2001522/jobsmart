import test from "node:test";
import assert from "node:assert/strict";
import {
  containsCjk,
  getDefaultInterviewQuestions,
  isTextInInterviewLocale,
  validatePredictedInterviewQuestions,
} from "../../src/lib/interview/question-utils.ts";

const reviews = [
  {
    id: "review-1",
    source_url: "https://example.com/review-1",
    title: "Product manager interview",
    content: "The interviewer asked how I prioritize competing product requests and measure impact.",
  },
];

test("default interview questions use the selected locale", () => {
  assert.equal(getDefaultInterviewQuestions("en")[0].question, "Tell me about yourself.");
  assert.match(getDefaultInterviewQuestions("zh-TW")[0].question, /自我介紹/);
});

test("language checks detect CJK and reject mixed-language English questions", () => {
  assert.equal(containsCjk("What is your plan?"), false);
  assert.equal(containsCjk("What is your 計畫?"), true);
  assert.equal(isTextInInterviewLocale("What is your plan?", "en"), true);
  assert.equal(isTextInInterviewLocale("請說明你的 plan", "en"), false);
  assert.equal(isTextInInterviewLocale("請說明你的計畫", "zh-TW"), true);
});

test("questions without matching review evidence are rejected", () => {
  const result = validatePredictedInterviewQuestions([
    {
      question: "How do you prioritize competing product requests?",
      category: "behavioral",
      difficulty: "medium",
      evidence: [{ reviewId: "review-1", quote: "The interviewer asked how I prioritize competing product requests" }],
    },
    {
      question: "What is your favorite color?",
      category: "other",
      difficulty: "easy",
      evidence: [{ reviewId: "review-1", quote: "The interviewer asked about salary expectations" }],
    },
  ], reviews, "en");
  assert.equal(result.length, 1);
  assert.equal(result[0].evidence[0].reviewId, "review-1");
  assert.deepEqual(result[0].source_urls, ["https://example.com/review-1"]);
});

test("AI-extracted fields cannot masquerade as quotes from the original review", () => {
  const result = validatePredictedInterviewQuestions([
    {
      question: "How would you design a scalable event pipeline?",
      category: "technical",
      difficulty: "hard",
      evidence: [{ reviewId: "review-1", quote: "How would you design a scalable event pipeline?" }],
    },
  ], [{ ...reviews[0], content: "The interview process included a technical screen.", questions: ["How would you design a scalable event pipeline?"] }], "en");
  assert.deepEqual(result, []);
});

test("question validation drops wrong-language, duplicate, malformed, and ungrounded entries", () => {
  const result = validatePredictedInterviewQuestions([
    { question: "請問你如何安排產品優先順序？", category: "behavioral", evidence: [{ reviewId: "review-1", quote: "The interviewer asked how I prioritize competing product requests" }] },
    { question: "How do you prioritize competing product requests?", category: "behavioral", evidence: [{ reviewId: "review-1", quote: "The interviewer asked how I prioritize competing product requests" }] },
    { question: "How do you prioritize competing product requests?", category: "behavioral", evidence: [{ reviewId: "review-1", quote: "The interviewer asked how I prioritize competing product requests" }] },
    null,
  ], reviews, "en");
  assert.equal(result.length, 1);
  assert.equal(result[0].question, "How do you prioritize competing product requests?");
});

test("question limit is clamped and empty evidence sources return no candidates", () => {
  const candidates = Array.from({ length: 10 }, (_, index) => ({
    question: `How do you handle product scenario number ${index}?`,
    category: "situational",
    difficulty: "medium",
    evidence: [{ reviewId: "review-1", quote: "The interviewer asked how I prioritize competing product requests" }],
  }));
  assert.equal(validatePredictedInterviewQuestions(candidates, reviews, "en", 2).length, 2);
  assert.deepEqual(validatePredictedInterviewQuestions(candidates, [], "en"), []);
  assert.deepEqual(validatePredictedInterviewQuestions(null, reviews, "en"), []);
});
