import { customizeResume } from "@/lib/ai/gateway";
import { generateCoverLetter } from "@/lib/ai/cover-letter";

export async function generateApplicationPackage(input: {
  resumeText: string;
  jobDescription: string;
  companyName: string;
  position: string;
  applicantName: string;
  contactEmail?: string;
}) {
  const tailored = await customizeResume(input.resumeText, input.jobDescription, input.companyName, input.position);
  const coverLetter = await generateCoverLetter({
    companyName: input.companyName,
    position: input.position,
    jobDescription: input.jobDescription,
    resumePlainText: tailored.customizedContent,
    applicantName: input.applicantName,
    contactEmail: input.contactEmail || "",
  });
  return { tailored, coverLetter };
}
