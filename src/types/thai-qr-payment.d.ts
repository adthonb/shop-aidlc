declare module "thai-qr-payment" {
  export type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";
  export type PromptPayRecipientType =
    | "mobile"
    | "nationalId"
    | "eWallet"
    | "bankAccount";

  export interface PayloadForOptions {
    recipient: string;
    amount?: number;
    type?: Exclude<PromptPayRecipientType, "bankAccount">;
    fromSatang?: boolean;
  }

  export interface QRMatrix {
    size: number;
    modules: boolean[][];
    version: number;
    errorCorrectionLevel: ErrorCorrectionLevel;
    mask: number;
  }

  export interface EncodeQROptions {
    errorCorrectionLevel?: ErrorCorrectionLevel;
    minVersion?: number;
    maxVersion?: number;
    forceMask?: number;
  }

  export interface RenderCardOptions {
    theme?: "color" | "silhouette";
    background?: string;
    accent?: string;
    qrColor?: string;
    headerLogo?: "Thai_QR_Payment_Logo-01";
    promptpayLogo?: "PromptPay1" | "PromptPay2";
    centerOverlay?: boolean;
    showCaption?: boolean;
    merchantName?: string;
    amountLabel?: string;
  }

  export interface RenderThaiQRPaymentOptions extends RenderCardOptions {
    recipient: string;
    amount?: number;
    recipientType?: Exclude<PromptPayRecipientType, "bankAccount">;
    fromSatang?: boolean;
    errorCorrectionLevel?: ErrorCorrectionLevel;
  }

  export interface RenderQRSvgOptions {
    quietZone?: number;
    foreground?: string;
    background?: string;
    size?: number;
    rootAttributes?: Record<string, string>;
  }

  export interface RenderThaiQRPaymentMatrixOptions extends RenderQRSvgOptions {
    recipient: string;
    amount?: number;
    recipientType?: Exclude<PromptPayRecipientType, "bankAccount">;
    fromSatang?: boolean;
    errorCorrectionLevel?: ErrorCorrectionLevel;
  }

  export class ThaiQRPaymentBuilder {
    promptpay(
      recipient: string,
      type?: Exclude<PromptPayRecipientType, "bankAccount">
    ): this;
    bankAccount(bankCode: string, accountNo: string): this;
    amount(amount?: number, options?: { fromSatang?: boolean }): this;
    merchant(options: {
      categoryCode?: string;
      name?: string;
      city?: string;
      postalCode?: string;
    }): this;
    build(): string;
  }

  export function payloadFor(options: PayloadForOptions): string;
  export function encodeQR(data: string, options?: EncodeQROptions): QRMatrix;
  export function renderCard(
    matrix: QRMatrix,
    options?: RenderCardOptions
  ): string;
  export function renderQRSvg(
    matrix: QRMatrix,
    options?: RenderQRSvgOptions
  ): string;
  export function renderThaiQRPayment(
    options: RenderThaiQRPaymentOptions
  ): string;
  export function renderThaiQRPaymentMatrix(
    options: RenderThaiQRPaymentMatrixOptions
  ): string;
}
