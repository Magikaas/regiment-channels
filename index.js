const { Client, Guild, Events, SlashCommandBuilder, PermissionsBitField } = require("discord.js");
const { Regiment } = require("./object/regiment");
const { MongoClient } = require("mongodb");

const HIGH_CAPTAIN_ROLE_ID = "770402080007258134";
const CAPTAIN_ROLE_ID = "758111751962230834";

class RegimentsChannelRestrictor {
    /**
     * 
     * @param {Client} client Discord Client
     * @param {MongoClient} database Databaseclient
     * @param {Guild} guild Current discord guild
     */
    constructor(client, database, guild) {
        this.client = client;
        this.database = database;
        this.guild = guild;
    }

    async addRegimentChatVisibilityCommand() {
        return new SlashCommandBuilder()
            .setName("regimentchatvisibility")
            .setDescription("Show or hide regiment chat")
            .addStringOption(option =>
                option.setName("visibility")
                    .setDescription("Show or hide regiment chat")
                    .setRequired(true)
                    .addChoices(
                        { name: "Show", value: "show" },
                        { name: "Hide", value: "hide" }
                    )
            );
    }

    addRegimentChatVisibilityCommandHandler() {
        // Add /regimentchatvisibility [show|hide] SlashCommand

        try {
            this.client.on(Events.InteractionCreate, async (interaction) => {
                try {
                    if (!interaction.isCommand()) return;
        
                    const { commandName, options } = interaction;
        
                    if (commandName === "regimentchatvisibility") {
                        const visibility = options.getString("visibility");
        
                        const roles = interaction.member.roles.cache.map(role => role.id);
        
                        const regiments = this.database.db().collection("regiments");
        
                        const regiment = await regiments.findOne({ roleId: { $in: roles } });
        
                        let textChannelId = "";

                        if (regiment.regiment_channels.text) {
                            textChannelId = regiment.regiment_channels.text;
                        }

                        let voiceChannelId = "";

                        if (regiment.regiment_channels.voice) {
                            voiceChannelId = regiment.regiment_channels.voice;
                        }

                        let textChannel = null;

                        if (textChannelId) {
                            textChannel = this.guild.channels.cache.get(textChannelId);
                        }

                        let voiceChannel = null;

                        if (voiceChannelId) {
                            voiceChannel = this.guild.channels.cache.get(voiceChannelId);
                        }

                        const textChannelViewPermissions = textChannel.permissionsFor(this.guild.members.cache.get(this.client.user.id)).serialize();
                        const voiceChannelViewPermissions = voiceChannel.permissionsFor(this.guild.members.cache.get(this.client.user.id)).serialize();

                        if (!textChannelViewPermissions.ViewChannel || !voiceChannelViewPermissions.ViewChannel) {
                            let message = "I do not have permission to view the channels: ";

                            if (!textChannelViewPermissions.ViewChannel) {
                                message += "<#" + textChannelId + ">";
                            }

                            if (!voiceChannelViewPermissions.ViewChannel) {
                                message += "<#" + voiceChannelId + ">";
                            }

                            message += ". Please give my bot role permission to view the Regiment text- and voice-channels.";

                            interaction.reply({ content: message, ephemeral: true });
                            return;
                        }
        
                        if (visibility === "show") {
                            // Show the text and voice channels
                            interaction.reply({ content: "Showing channels: <#" + textChannelId + ">, <#" + voiceChannelId + ">", ephemeral: true });

                            if (textChannel) {
                                await textChannel.permissionOverwrites.edit(this.guild.id, { ViewChannel: true });
                            }

                            if (voiceChannel) {
                                await voiceChannel.permissionOverwrites.edit(this.guild.id, { ViewChannel: true });
                            }
                        } else if (visibility === "hide") {
                            // Hide the text and voice channels
                            interaction.reply({ content: "Hiding channels: <#" + textChannelId + ">, <#" + voiceChannelId + ">", ephemeral: true });

                            if (textChannel) {
                                await textChannel.permissionOverwrites.edit(this.guild.members.cache.get(this.client.user.id), { ViewChannel: true });

                                await textChannel.permissionOverwrites.edit(this.guild.id, { ViewChannel: false });
                            }

                            if (voiceChannel) {
                                await voiceChannel.permissionOverwrites.edit(this.guild.members.cache.get(this.client.user.id), { ViewChannel: true });

                                await voiceChannel.permissionOverwrites.edit(this.guild.id, { ViewChannel: false });
                            }
                        }
                    }
                }
                catch (error) {
                    console.error(error);
                }
            });
        }
        catch (error) {
            console.error(error);
        }
    }
}

module.exports = {
    RegimentsChannelRestrictor
};