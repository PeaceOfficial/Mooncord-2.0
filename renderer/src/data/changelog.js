import config from "./config";

// fixed, improved, added, progress
export default {
    title: "Mooncord",
    subtitle: `v${config.version}`,
    // video: "https://www.youtube.com/embed/evyvq9eQTqA?si=opmzjGjUArT4VLrj&vq=hd720p&hd=1&rel=0&showinfo=0&mute=1&loop=1&autohide=1",
    // banner: "https://i.imgur.com/wuh5yMK.png",
    banner: "https://raw.githubusercontent.com/PeaceOfficial/Mooncord-Rework/refs/heads/main/assets/pictures/mooncord-logo.png?token=GHSAT0AAAAAAC4JGLACDMAY4WZENVAY5UEMZ3IQKSA",
    blurb: "This update is mostly to make the lives of plugin developers easier. Users should see more plugins with fancy settings panels in the coming days!",
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
