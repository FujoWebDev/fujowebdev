import { z } from "astro:content";
import { type ProfileMatch, SocialLinks } from "social-links";

export const socialsSchema = z.union([
  z.string().url(),
  z.object({
    icon: z.string().optional(),
    platform: z.string().optional(),
    url: z.string().url(),
    username: z.string().optional(),
  }),
]);
export type SocialsSchema = z.infer<typeof socialsSchema>;

export type SocialsData = {
  icon: string | null;
  url: string;
  username: string | null;
  platform: WEBSITE_TYPES;
};

export type WEBSITE_TYPES =
  | "github"
  | "tumblr"
  | "twitter"
  | "npm"
  | "web"
  | "bsky"
  | "twitch"
  | "mastodon"
  | "dreamwidth"
  | "ko-fi"
  | "patreon"
  | "youtube"
  | "kickstarter"
  | "inprnt"
  | "neocities";

export const transformSocial = (social: SocialsSchema) => {
  if (typeof social == "string") {
    return extractSocialData({ url: social });
  }
  const { icon, url, platform, username } = social;
  const data = extractSocialData({ url });

  return {
    ...data,
    icon:
      icon ??
      (platform === undefined
        ? data.icon
        : getSocialIcon(platform as WEBSITE_TYPES)),
    url,
    platform,
    username,
  };
};

const socialLinks = new SocialLinks();
const tumblrMatches: ProfileMatch[] = [
  {
    match: "https?://([a-z0-9-]+).tumblr.com/?",
    // TODO: more may be necessary for things like extracting usernames
    group: 1,
  },
  {
    match: "https?://www.tumblr.com/([a-z0-9-]+)",
    // TODO: more may be necessary for things like extracting usernames
    group: 1,
  },
];
socialLinks.addProfile("tumblr", tumblrMatches);
const kofiMatches: ProfileMatch[] = [
  {
    match: "https?://ko-fi.com/([a-z0-9-_]+)",
    group: 1,
  },
];
socialLinks.addProfile("ko-fi", kofiMatches);

const inprntMatches: ProfileMatch[] = [
  {
    match: "https?://(?:www.)?inprnt.com/gallery/([a-z0-9-]+)/?",
    group: 1,
  },
];
socialLinks.addProfile("inprnt", inprntMatches);

const neocitiesMatches: ProfileMatch[] = [
  {
    match: "https?://([a-z0-9-]+).neocities.org",
    group: 1,
  },
];
socialLinks.addProfile("neocities", neocitiesMatches);

const blueSkyMatches: ProfileMatch[] = [
  {
    match: "https?://([a-z0-9-]+).bsky.social",
    group: 1,
  },
];
socialLinks.addProfile("bsky", blueSkyMatches);

const ao3Matches: ProfileMatch[] = [
  {
    match: "https?://archiveofourown.org/users/([a-z0-9-]+)",
    group: 1,
  },
];
socialLinks.addProfile("archiveofourown", ao3Matches);

const dreamwidthMatches: ProfileMatch[] = [
  {
    match: "https?://([a-z0-9-]+).dreamwidth.org",
    group: 1,
  },
];
socialLinks.addProfile("dreamwidth", dreamwidthMatches);

const furaffinityMatches: ProfileMatch[] = [
  {
    match: "https?://www.furaffinity.net/user/([a-z0-9-]+)",
    group: 1,
  },
];
socialLinks.addProfile("furaffinity", furaffinityMatches);

const carrdMatches: ProfileMatch[] = [
  {
    match: "https?://([a-z0-9-]+).carrd.co/?",
    group: 1,
  },
];
socialLinks.addProfile("carrd", carrdMatches);

const getSocialIcon = (platform: WEBSITE_TYPES) => {
  if (platform === "inprnt") {
    return "lucide:shopping-bag";
  }
  if (platform === "neocities") {
    return "lucide:cat";
  }
  if (platform === "bsky") {
    return "simple-icons:bluesky";
  }
  if (platform === "dreamwidth") {
    return "simple-icons:livejournal";
  }
  return "simple-icons:" + platform.replaceAll("-", "");
};

export const extractSocialData = ({ url }: { url: string }): SocialsData => {
  const lowerUrl = url.toLowerCase();
  const socialLinkAttempt = socialLinks.detectProfile(lowerUrl);
  if (socialLinkAttempt) {
    return {
      url,
      platform: socialLinkAttempt as WEBSITE_TYPES,
      username: socialLinks.getProfileId(socialLinkAttempt, lowerUrl),
      icon: getSocialIcon(socialLinkAttempt as WEBSITE_TYPES),
    };
  }
  // If you cannot find it, return the original url
  return { url, platform: "web", username: null, icon: null };
};
