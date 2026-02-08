/**
 * Gmail 草稿建立模組
 * 使用 Gmail API 建立 Email 草稿
 */

import { getGmailClient } from "./oauth";
import {
  generateCoverLetter,
  formatEmailForGmail,
  encodeEmailForGmailApi,
} from "@/lib/ai/cover-letter";

// 草稿建立結果
export interface GmailDraftResult {
  success: boolean;
  draftId?: string;
  gmailUrl?: string;
  error?: string;
}

/**
 * 建立 Gmail 草稿
 */
export async function createGmailDraft(options: {
  userId: string;
  to: string;
  subject: string;
  body: string;
}): Promise<GmailDraftResult> {
  const { userId, to, subject, body } = options;

  try {
    const gmail = await getGmailClient(userId);

    if (!gmail) {
      return {
        success: false,
        error: "Gmail not connected",
      };
    }

    // 格式化 Email
    const rawEmail = formatEmailForGmail({ to, subject, body });
    const encodedEmail = encodeEmailForGmailApi(rawEmail);

    // 建立草稿
    const response = await gmail.users.drafts.create({
      userId: "me",
      requestBody: {
        message: {
          raw: encodedEmail,
        },
      },
    });

    const draftId = response.data.id;
    const messageId = response.data.message?.id;

    return {
      success: true,
      draftId: draftId || undefined,
      gmailUrl: messageId
        ? `https://mail.google.com/mail/u/0/#drafts?compose=${messageId}`
        : undefined,
    };
  } catch (error) {
    console.error("Error creating Gmail draft:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * 為職缺自動建立求職信草稿
 */
export async function createJobApplicationDraft(options: {
  userId: string;
  companyName: string;
  position: string;
  contactEmail: string;
  jobDescription?: string;
  applicationInstruction?: string;
  resumePlainText?: string;
  applicantName?: string;
}): Promise<GmailDraftResult> {
  const {
    userId,
    companyName,
    position,
    contactEmail,
    jobDescription,
    applicationInstruction,
    resumePlainText,
    applicantName,
  } = options;

  try {
    // 1. 生成求職信內容
    const coverLetter = await generateCoverLetter({
      companyName,
      position,
      jobDescription,
      applicationInstruction,
      resumePlainText,
      applicantName,
      contactEmail,
    });

    // 2. 建立草稿
    return await createGmailDraft({
      userId,
      to: contactEmail,
      subject: coverLetter.subject,
      body: coverLetter.body,
    });
  } catch (error) {
    console.error("Error creating job application draft:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * 取得草稿列表
 */
export async function listDrafts(userId: string): Promise<
  {
    id: string;
    snippet: string;
  }[]
> {
  try {
    const gmail = await getGmailClient(userId);

    if (!gmail) {
      return [];
    }

    const response = await gmail.users.drafts.list({
      userId: "me",
      maxResults: 10,
    });

    return (
      response.data.drafts?.map((draft) => ({
        id: draft.id || "",
        snippet: draft.message?.snippet || "",
      })) || []
    );
  } catch (error) {
    console.error("Error listing drafts:", error);
    return [];
  }
}

/**
 * 刪除草稿
 */
export async function deleteDraft(
  userId: string,
  draftId: string
): Promise<boolean> {
  try {
    const gmail = await getGmailClient(userId);

    if (!gmail) {
      return false;
    }

    await gmail.users.drafts.delete({
      userId: "me",
      id: draftId,
    });

    return true;
  } catch (error) {
    console.error("Error deleting draft:", error);
    return false;
  }
}
