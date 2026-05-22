const { storage } = vendetta.plugin;
const { React } = vendetta.metro.common;
const { findByProps } = vendetta.metro;
const { Forms } = vendetta.ui.components;
const { showToast } = vendetta.ui.toasts;
const { useProxy } = vendetta.storage;

storage.textReplacements ??= [];
storage.isTextReplaceEnabled ??= true;
storage.enabledBadges ??= [];
storage.selectedNitroBadge ??= "NONE";

const ALL_BADGES = {
    STAFF: { flag: 1 << 0, name: "Discord Staff" },
    PARTNER: { flag: 1 << 1, name: "Partnered Server Owner" },
    HYPESQUAD: { flag: 1 << 2, name: "HypeSquad Events" },
    BUG_HUNTER_LEVEL_1: { flag: 1 << 3, name: "Bug Hunter Level 1" },
    HYPESQUAD_ONLINE_HOUSE_1: { flag: 1 << 6, name: "HypeSquad Bravery" },
    HYPESQUAD_ONLINE_HOUSE_2: { flag: 1 << 7, name: "HypeSquad Brilliance" },
    HYPESQUAD_ONLINE_HOUSE_3: { flag: 1 << 8, name: "HypeSquad Balance" },
    PREMIUM_EARLY_SUPPORTER: { flag: 1 << 9, name: "Early Supporter" },
    BUG_HUNTER_LEVEL_2: { flag: 1 << 14, name: "Bug Hunter Level 2" },
    VERIFIED_DEVELOPER: { flag: 1 << 17, name: "Early Verified Bot Developer" },
    DISCORD_CERTIFIED_MODERATOR: { flag: 1 << 18, name: "Moderator Programs Alumni" },
    ACTIVE_DEVELOPER: { flag: 1 << 22, name: "Active Developer" }
};

const NITRO_BADGES = {
    NONE: { months: 0, name: "No Badge" },
    BRONZE: { months: 1, name: "1 month" },
    SILVER: { months: 2, name: "2 months" },
    GOLD: { months: 3, name: "3 months" },
    PLATINUM: { months: 6, name: "6 months" },
    DIAMOND: { months: 12, name: "12 months" },
    EMERALD: { months: 15, name: "15 months" },
    RUBY: { months: 18, name: "18 months" },
    OPAL: { months: 24, name: "24 months" }
};

let unpatches = [];

function SettingsPanel() {
    useProxy(storage);
    
    return React.createElement(React.Fragment, null,
        React.createElement(Forms.FormSection, { title: "Text Replacement" },
            React.createElement(Forms.FormSwitchRow, {
                label: "Enable Text Replacement",
                value: storage.isTextReplaceEnabled,
                onValueChange: v => storage.isTextReplaceEnabled = v
            }),
            React.createElement(Forms.FormRow, {
                label: "Replacements: " + storage.textReplacements.length,
                subLabel: "Tap to manage"
            })
        ),
        React.createElement(Forms.FormSection, { title: "Profile Badges" },
            Object.keys(ALL_BADGES).map(key => {
                const badge = ALL_BADGES[key];
                return React.createElement(Forms.FormSwitchRow, {
                    key: key,
                    label: badge.name,
                    value: storage.enabledBadges.includes(key),
                    onValueChange: enabled => {
                        storage.enabledBadges = enabled 
                            ? [...storage.enabledBadges, key]
                            : storage.enabledBadges.filter(b => b !== key);
                    }
                });
            })
        ),
        React.createElement(Forms.FormSection, { title: "Nitro Badge" },
            Object.keys(NITRO_BADGES).map(key => {
                const badge = NITRO_BADGES[key];
                return React.createElement(Forms.FormRow, {
                    key: key,
                    label: badge.name,
                    trailing: storage.selectedNitroBadge === key ? "✓" : "",
                    onPress: () => {
                        storage.selectedNitroBadge = key;
                        showToast(badge.name, 1);
                    }
                });
            })
        )
    );
}

export default {
    onLoad: () => {
        const MessageActions = findByProps("sendMessage");
        if (MessageActions) {
            unpatches.push(vendetta.patcher.before("sendMessage", MessageActions, args => {
                if (!storage.isTextReplaceEnabled) return;
                const message = args[1];
                if (message?.content) {
                    let content = message.content;
                    storage.textReplacements.forEach(rep => {
                        content = content.split(rep.find).join(rep.replace);
                    });
                    message.content = content;
                }
            }));
        }
        
        const UserStore = findByProps("getCurrentUser", "getUser");
        if (UserStore) {
            unpatches.push(vendetta.patcher.after("getCurrentUser", UserStore, (_, __, user) => {
                if (!user) return;
                
                if (storage.enabledBadges.length > 0) {
                    let flags = user.flags || 0;
                    storage.enabledBadges.forEach(key => {
                        const badge = ALL_BADGES[key];
                        if (badge) flags |= badge.flag;
                    });
                    user.flags = flags;
                }
                
                if (storage.selectedNitroBadge !== "NONE") {
                    const badge = NITRO_BADGES[storage.selectedNitroBadge];
                    if (badge?.months > 0) {
                        user.premiumType = 2;
                        user.premium = true;
                        const date = new Date();
                        date.setMonth(date.getMonth() - badge.months);
                        user.premiumSince = date.toISOString();
                    }
                }
            }));
        }
    },
    onUnload: () => {
        unpatches.forEach(u => u?.());
        unpatches = [];
    },
    settings: SettingsPanel
};
