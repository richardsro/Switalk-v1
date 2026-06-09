// lucide-react no longer ships brand icons, so platforms get themed stand-ins
import {
  Mail,
  Camera,
  MessageCircle,
  ThumbsUp,
  Send,
  Globe,
  Briefcase,
  Music2,
} from "lucide-react";
import type { ChannelType } from "@/lib/types";

const ICONS: Record<ChannelType, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  instagram: Camera,
  whatsapp: MessageCircle,
  facebook: ThumbsUp,
  telegram: Send,
  webchat: Globe,
  linkedin: Briefcase,
  tiktok: Music2,
};

export const CHANNEL_LABELS: Record<ChannelType, string> = {
  email: "Email",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  facebook: "Facebook",
  telegram: "Telegram",
  webchat: "Webchat",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
};

export function ChannelIcon({
  type,
  className = "h-4 w-4",
}: {
  type: ChannelType;
  className?: string;
}) {
  const Icon = ICONS[type] ?? Globe;
  return <Icon className={className} />;
}
