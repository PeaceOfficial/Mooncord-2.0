import config from "./config";

// fixed, improved, added, progress
export default {
    title: "Mooncord",
    subtitle: `v${config.version}`,
    banner: "https://raw.githubusercontent.com/PeaceOfficial/Mooncord-2.0/refs/heads/main/assets/pictures/mooncord-logo.png",
    blurb: "I’m thrilled to share some exciting news Mooncorders!",
    changes: [
        {
            title: "New Plugin >> Moonlink",
            type: "added",
            blurb: "Moonlink is a powerful „Api & Plugin” designed to seamlessly connect and enhance the functionalities of Mooncord. Acting as a bridge, Moonlink facilitates effortless integration, allowing users to customize their experience and unlock & bypass „Discord Nitro” features.",
            items: [
                "Unlocked Nitro Functions: Access exclusive features without limitations.",
                "Custom Streaming Settings: Tailored configurations for the best streaming experience.",
                "Tweaks and Optimizations: Smoother and more personalized interactions.",
                "Avatar & Banner Decorations: Unlock unique ways to style your profile.",
                "Custom Decorations: Fully personalize your Discord experience.",
                "Custom Themes: Design your client to reflect your style.",
            ]
        },
        {
            title: "Bugs Squashed",
            type: "fixed",
            items: [
                "Plugin settings modal should no longer overflow your screen!",
                "The Mooncord version (and debug info) at the bottom left of settings should be there again.",
                "Enabling or disabling the custom css system will now update things properly.",
                "No more weird `0` showing up on screen after exiting a modal.",
                "Tooltips will now stop ignoring custom labels.",
                "Lazy `Webpack` listeners as well as `Filters.combine` are now given the right number of arguments.",
            ]
        },
    ]
};
