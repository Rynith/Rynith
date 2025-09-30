// lib/notify.ts
import { toast } from "@/hooks/use-toast";

export const notify = {
  success(message: string, title = "Success", duration = 3500) {
    toast({ variant: "success" as any, title, description: message, duration });
  },
  error(message: string, title = "Error", duration = 5000) {
    toast({ variant: "destructive", title, description: message, duration });
  },
  info(message: string, title = "Notice", duration = 3500) {
    toast({ title, description: message, duration });
  },
};
