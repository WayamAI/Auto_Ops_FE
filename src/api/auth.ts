import { api } from "./client";
import type {
  LoginRequest,
  SignupRequest,
  VerifyOtpRequest,
  ResendOtpRequest,
  AuthResponseBase,
  LoginData,
  SignupData,
  VerifyOtpData,
  ResendOtpData,
  AccessModuleData,
  UserDetails,
  UserUpdateRequest,
  UploadData,
} from "./types";

export const authService = {
  login: (data: LoginRequest) =>
    api.post<AuthResponseBase<LoginData>>("/login", data),

  signup: (data: SignupRequest) =>
    api.post<AuthResponseBase<SignupData>>("/signup", data),

  verifyOtp: (data: VerifyOtpRequest) =>
    api.post<AuthResponseBase<VerifyOtpData>>("/verify_otp", data),

  resendOtp: (data: ResendOtpRequest) =>
    api.post<AuthResponseBase<ResendOtpData>>("/resend_otp", data),

  getAccessModule: () =>
    api.get<AuthResponseBase<AccessModuleData>>("/get_access_module"),

  getUserDetails: (id: string) =>
    api.get<AuthResponseBase<UserDetails>>(`/users/get/${id}`),

  updateUser: (id: string, data: UserUpdateRequest) =>
    api.put<AuthResponseBase<UserDetails>>(`/users/update/${id}`, data),
    
  uploadFile: (formData: FormData) =>
    api.postFile<AuthResponseBase<UploadData>>("/upload", formData),
};
