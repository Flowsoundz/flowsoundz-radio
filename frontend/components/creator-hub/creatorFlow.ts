export const CREATOR_FLOW_STEPS = [
  {
    id: "create",
    href: "/artist/create",
    label: "Create",
    title: "Lock the song concept",
    description: "Shape the idea, themes, and angle before you package the release.",
  },
  {
    id: "kit",
    href: "/artist/kit",
    label: "AI Kit",
    title: "Generate the release kit",
    description: "Build promo copy, radio intro language, hooks, and social rollout assets.",
  },
  {
    id: "video",
    href: "/artist/video",
    label: "Visuals",
    title: "Build visuals and motion",
    description: "Turn the song into video prompts and content that can move on social.",
  },
  {
    id: "submit",
    href: "/artist/submit",
    label: "Submit",
    title: "Send the finished package",
    description: "Confirm rights, add links, and hand FlowSoundz a review-ready release.",
  },
] as const;

export type CreatorFlowStepId = (typeof CREATOR_FLOW_STEPS)[number]["id"];

export function getCreatorFlowStep(stepId: CreatorFlowStepId) {
  return CREATOR_FLOW_STEPS.find((step) => step.id === stepId) ?? CREATOR_FLOW_STEPS[0];
}

