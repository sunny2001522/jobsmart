/**
 * LINE Flex Message 模板
 */

import { FlexMessage, TextMessage } from "@line/bot-sdk";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * 處理中訊息
 */
export function createProcessingMessage(): TextMessage {
  return {
    type: "text",
    text: "收到！正在處理中...\n\n系統正在：\n• 解析職缺內容\n• 查詢公司評價\n• 客製化履歷\n\n完成後會通知你 🚀",
  };
}

/**
 * 需要綁定帳號訊息
 */
export function createBindingRequiredMessage(liffUrl: string): FlexMessage {
  return {
    type: "flex",
    altText: "請先連結 JobSmart 帳號",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "JobSmart",
            weight: "bold",
            size: "xl",
            color: "#1a1a1a",
          },
          {
            type: "text",
            text: "請先連結你的 JobSmart 帳號，才能使用職缺追蹤功能",
            size: "sm",
            color: "#666666",
            margin: "md",
            wrap: true,
          },
        ],
        paddingAll: "20px",
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            action: {
              type: "uri",
              label: "連結帳號",
              uri: liffUrl,
            },
            style: "primary",
            color: "#10b981",
          },
        ],
        paddingAll: "15px",
      },
    },
  };
}

/**
 * 綁定成功訊息
 */
export function createBindingSuccessMessage(displayName: string): FlexMessage {
  return {
    type: "flex",
    altText: "帳號連結成功！",
    contents: {
      type: "bubble",
      hero: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "✓",
            size: "3xl",
            align: "center",
            color: "#ffffff",
          },
        ],
        paddingAll: "20px",
        backgroundColor: "#10b981",
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "帳號連結成功！",
            weight: "bold",
            size: "lg",
          },
          {
            type: "text",
            text: `歡迎 ${displayName}！\n現在你可以直接在這裡分享職缺連結了`,
            size: "sm",
            color: "#666666",
            margin: "md",
            wrap: true,
          },
          {
            type: "separator",
            margin: "lg",
          },
          {
            type: "text",
            text: "試試看：",
            size: "sm",
            color: "#888888",
            margin: "lg",
          },
          {
            type: "text",
            text: "• 直接貼上職缺連結",
            size: "sm",
            margin: "sm",
          },
          {
            type: "text",
            text: "• 從其他 App 分享到這裡",
            size: "sm",
            margin: "sm",
          },
        ],
        paddingAll: "20px",
      },
    },
  };
}

/**
 * 職缺新增成功訊息
 */
export function createJobAddedMessage(data: {
  companyName: string;
  position: string;
  atsScore?: number;
  companyReview?: {
    positiveRate: number;
    count: number;
  } | null;
  resumeVersion?: string;
  category?: string;
  hasEmailDraft: boolean;
  jobApplicationId: string;
  gmailUrl?: string;
}): FlexMessage {
  const viewUrl = `${APP_URL}/applications?highlight=${data.jobApplicationId}`;

  const bodyContents: any[] = [
    {
      type: "text",
      text: data.companyName,
      weight: "bold",
      size: "xl",
    },
    {
      type: "text",
      text: data.position,
      size: "md",
      color: "#666666",
    },
    {
      type: "separator",
      margin: "lg",
    },
  ];

  // 詳細資訊區塊
  const detailsContents: any[] = [];

  if (data.companyReview) {
    detailsContents.push({
      type: "box",
      layout: "horizontal",
      contents: [
        {
          type: "text",
          text: "公司評價",
          size: "sm",
          color: "#888888",
          flex: 2,
        },
        {
          type: "text",
          text: `正面 ${Math.round(data.companyReview.positiveRate)}% (${data.companyReview.count}則)`,
          size: "sm",
          color: data.companyReview.positiveRate >= 60 ? "#10b981" : "#f59e0b",
          flex: 3,
          align: "end",
        },
      ],
    });
  }

  if (data.atsScore) {
    detailsContents.push({
      type: "box",
      layout: "horizontal",
      margin: "sm",
      contents: [
        {
          type: "text",
          text: "ATS 分數",
          size: "sm",
          color: "#888888",
          flex: 2,
        },
        {
          type: "text",
          text: `${data.atsScore} 分`,
          size: "sm",
          color: data.atsScore >= 70 ? "#10b981" : "#f59e0b",
          flex: 3,
          align: "end",
        },
      ],
    });
  }

  if (data.resumeVersion) {
    detailsContents.push({
      type: "box",
      layout: "horizontal",
      margin: "sm",
      contents: [
        {
          type: "text",
          text: "履歷版本",
          size: "sm",
          color: "#888888",
          flex: 2,
        },
        {
          type: "text",
          text: data.resumeVersion,
          size: "sm",
          flex: 3,
          align: "end",
        },
      ],
    });
  }

  if (data.category) {
    detailsContents.push({
      type: "box",
      layout: "horizontal",
      margin: "sm",
      contents: [
        {
          type: "text",
          text: "類別",
          size: "sm",
          color: "#888888",
          flex: 2,
        },
        {
          type: "text",
          text: data.category,
          size: "sm",
          flex: 3,
          align: "end",
        },
      ],
    });
  }

  detailsContents.push({
    type: "box",
    layout: "horizontal",
    margin: "sm",
    contents: [
      {
        type: "text",
        text: "Email 草稿",
        size: "sm",
        color: "#888888",
        flex: 2,
      },
      {
        type: "text",
        text: data.hasEmailDraft ? "已建立" : "未建立",
        size: "sm",
        color: data.hasEmailDraft ? "#10b981" : "#9ca3af",
        flex: 3,
        align: "end",
      },
    ],
  });

  bodyContents.push({
    type: "box",
    layout: "vertical",
    margin: "lg",
    contents: detailsContents,
  });

  // Footer 按鈕
  const footerContents: any[] = [
    {
      type: "button",
      action: {
        type: "uri",
        label: "查看詳情",
        uri: viewUrl,
      },
      style: "primary",
      color: "#10b981",
    },
  ];

  if (data.hasEmailDraft && data.gmailUrl) {
    footerContents.push({
      type: "button",
      action: {
        type: "uri",
        label: "開啟 Gmail 草稿",
        uri: data.gmailUrl,
      },
      style: "secondary",
      margin: "sm",
    });
  }

  return {
    type: "flex",
    altText: `職缺已加入追蹤：${data.companyName} - ${data.position}`,
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "horizontal",
        contents: [
          {
            type: "text",
            text: "新職缺已追蹤",
            weight: "bold",
            color: "#ffffff",
            flex: 1,
          },
          ...(data.atsScore
            ? [
                {
                  type: "text" as const,
                  text: `ATS ${data.atsScore}分`,
                  size: "sm" as const,
                  color: "#ffffff",
                  align: "end" as const,
                  weight: "bold" as const,
                },
              ]
            : []),
        ],
        backgroundColor: "#10b981",
        paddingAll: "15px",
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: bodyContents,
        paddingAll: "20px",
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: footerContents,
        paddingAll: "15px",
      },
    },
  };
}

/**
 * 錯誤訊息
 */
export function createErrorMessage(
  errorType: "PARSE_FAILED" | "NETWORK_ERROR" | "UNKNOWN",
  message?: string
): FlexMessage {
  const errorMessages: Record<string, string> = {
    PARSE_FAILED: "無法解析此連結，可能是：\n• 網站需要登入\n• 職缺已下架\n• 不支援的網站格式",
    NETWORK_ERROR: "網路連線失敗，請稍後再試",
    UNKNOWN: message || "處理失敗，請稍後再試",
  };

  return {
    type: "flex",
    altText: "處理失敗",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "處理失敗",
            weight: "bold",
            color: "#ef4444",
          },
          {
            type: "text",
            text: errorMessages[errorType],
            size: "sm",
            color: "#666666",
            margin: "lg",
            wrap: true,
          },
        ],
        paddingAll: "20px",
      },
      footer: {
        type: "box",
        layout: "horizontal",
        contents: [
          {
            type: "button",
            action: {
              type: "uri",
              label: "手動新增",
              uri: `${APP_URL}/applications/new`,
            },
            style: "primary",
            flex: 1,
          },
        ],
        paddingAll: "15px",
      },
    },
  };
}

/**
 * 幫助訊息
 */
export function createHelpMessage(): FlexMessage {
  return {
    type: "flex",
    altText: "JobSmart 使用說明",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "JobSmart 使用說明",
            weight: "bold",
            size: "lg",
          },
          {
            type: "separator",
            margin: "lg",
          },
          {
            type: "text",
            text: "你可以直接分享以下內容：",
            size: "sm",
            color: "#666666",
            margin: "lg",
          },
          {
            type: "text",
            text: "• 104、CakeResume、Yourator 職缺連結",
            size: "sm",
            margin: "sm",
          },
          {
            type: "text",
            text: "• LinkedIn Jobs 連結",
            size: "sm",
            margin: "sm",
          },
          {
            type: "text",
            text: "• Threads、Facebook 求職貼文",
            size: "sm",
            margin: "sm",
          },
          {
            type: "separator",
            margin: "lg",
          },
          {
            type: "text",
            text: "系統會自動：",
            size: "sm",
            color: "#666666",
            margin: "lg",
          },
          {
            type: "text",
            text: "• 解析職缺內容",
            size: "sm",
            margin: "sm",
          },
          {
            type: "text",
            text: "• 查詢公司評價",
            size: "sm",
            margin: "sm",
          },
          {
            type: "text",
            text: "• 客製化履歷",
            size: "sm",
            margin: "sm",
          },
          {
            type: "text",
            text: "• 建立 Gmail 應徵信草稿",
            size: "sm",
            margin: "sm",
          },
        ],
        paddingAll: "20px",
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            action: {
              type: "uri",
              label: "開啟 JobSmart",
              uri: APP_URL,
            },
            style: "primary",
            color: "#10b981",
          },
        ],
        paddingAll: "15px",
      },
    },
  };
}
