require('dotenv').config();

const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Events,
    PermissionsBitField,
    StringSelectMenuBuilder
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

// ===== IDS =====
const VERIFY_CHANNEL_ID = '1515833574639669388';
const VERIFY_ROLE_ID = '1515831883425124412';

const TICKET_PANEL_CHANNEL_ID = '1515828291695673405';
const TICKET_CATEGORY_ID = '1516043869257597023';

const LOG_CHANNEL_ID = '1515828465528471562';

const ROLE_1 = '1515830402491879584';
const ROLE_2 = '1515824249871270051';

// ================= READY =================
client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);

    // ================= VERIFY PANEL =================
    const verifyChannel = await client.channels.fetch(VERIFY_CHANNEL_ID);

    const verifyEmbed = new EmbedBuilder()
        .setColor('#00bfff')
        .setTitle('🔐 Verification')
        .setDescription('Spausk mygtuką žemiau, kad gautum prieigą prie serverio.');

    const verifyButton = new ButtonBuilder()
        .setCustomId('verify_button')
        .setLabel('Verify')
        .setStyle(ButtonStyle.Success);

    const verifyRow = new ActionRowBuilder().addComponents(verifyButton);

    await verifyChannel.send({
        embeds: [verifyEmbed],
        components: [verifyRow]
    });

    // ================= TICKET PANEL =================
    const ticketChannel = await client.channels.fetch(TICKET_PANEL_CHANNEL_ID);

    const ticketEmbed = new EmbedBuilder()
        .setColor('#ff6600')
        .setTitle('🎫 Ticket System')
        .setDescription('Pasirink kategoriją prieš kuriant ticket.');

    const menu = new StringSelectMenuBuilder()
        .setCustomId('ticket_category')
        .setPlaceholder('🎯 Pasirink ticket tipą')
        .addOptions(
            {
                label: 'Buy / Pirkti',
                value: 'pirkti',
                emoji: '🛒'
            },
            {
                label: 'Support',
                value: 'support',
                emoji: '🛠️'
            }
        );

    const row = new ActionRowBuilder().addComponents(menu);

    await ticketChannel.send({
        embeds: [ticketEmbed],
        components: [row]
    });

    console.log('✅ Panels sent');
});

// ================= CHECK OPEN TICKET =================
async function userHasTicket(guild, userId) {
    const channels = await guild.channels.fetch();

    return channels.some(ch =>
        ch &&
        ch.permissionOverwrites.cache?.some(po => po.id === userId)
    );
}

// ================= COUNT CATEGORY TICKETS =================
async function getCategoryTicketNumber(guild, category) {
    const channels = await guild.channels.fetch();
    let max = 0;

    channels.forEach(ch => {
        if (ch && ch.name && ch.name.startsWith(`${category}-`)) {
            const num = parseInt(ch.name.split('-')[1]);
            if (!isNaN(num) && num > max) max = num;
        }
    });

    return max + 1;
}

// ================= CREATE TICKET =================
async function createTicket(interaction, type) {

    const guild = interaction.guild;
    const userId = interaction.user.id;

    const hasTicket = await userHasTicket(guild, userId);

    if (hasTicket) {
        return interaction.reply({
            content: '❌ You already have an open ticket!',
            ephemeral: true
        });
    }

    const ticketNumber = await getCategoryTicketNumber(guild, type);

    const channel = await guild.channels.create({
        name: `${type}-${ticketNumber}`,
        type: 0,
        parent: TICKET_CATEGORY_ID,
        permissionOverwrites: [
            {
                id: guild.id,
                deny: [PermissionsBitField.Flags.ViewChannel]
            },
            {
                id: userId,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.ReadMessageHistory
                ]
            },
            {
                id: ROLE_1,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.ReadMessageHistory
                ]
            },
            {
                id: ROLE_2,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.ReadMessageHistory
                ]
            }
        ]
    });

    const embed = new EmbedBuilder()
        .setColor('#ff6600')
        .setTitle(`🎫 ${type.toUpperCase()} Ticket #${ticketNumber}`)
        .setDescription(
            `📦 Category: **${type.toUpperCase()}**\n\n` +
            `👋 Parašyk savo užklausą.\n` +
            `💬 Staff greitai atsakys.`
        );

    const closeBtn = new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(closeBtn);

    await channel.send({
        content: `<@${userId}> <@&${ROLE_1}> <@&${ROLE_2}>`,
        embeds: [embed],
        components: [row]
    });

    // ================= LOGS =================
    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);

    const logEmbed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle('📊 Ticket Created')
        .addFields(
            { name: 'User', value: `<@${userId}>`, inline: true },
            { name: 'Type', value: type, inline: true },
            { name: 'Channel', value: `${channel.name}` }
        )
        .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] });

    return interaction.reply({
        content: `✅ Ticket created: ${channel}`,
        ephemeral: true
    });
}

// ================= EVENTS =================
client.on(Events.InteractionCreate, async interaction => {

    // VERIFY
    if (interaction.isButton() && interaction.customId === 'verify_button') {
        const role = interaction.guild.roles.cache.get(VERIFY_ROLE_ID);
        await interaction.member.roles.add(role);

        return interaction.reply({
            content: '✅ Verified!',
            ephemeral: true
        });
    }

    // CATEGORY SELECT
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_category') {
        const type = interaction.values[0];
        return createTicket(interaction, type);
    }

    // CLOSE TICKET
    if (interaction.isButton() && interaction.customId === 'close_ticket') {

        await interaction.reply({
            content: '🔒 Closing ticket...',
            ephemeral: true
        });

        setTimeout(async () => {
            await interaction.channel.delete().catch(() => {});
        }, 2000);
    }
});

client.login(process.env.TOKEN);
