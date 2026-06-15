require('dotenv').config();

const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Events,
    PermissionsBitField
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

// ===== IDs =====
const VERIFY_CHANNEL_ID = '1515833574639669388';
const VERIFY_ROLE_ID = '1515831883425124412';

const TICKET_PANEL_CHANNEL_ID = '1515828291695673405';
const TICKET_CATEGORY_ID = '1516043869257597023';

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
        .setDescription('Spausk mygtuką norėdamas sukurti ticket.');

    const ticketButton = new ButtonBuilder()
        .setCustomId('open_ticket')
        .setLabel('Create Ticket')
        .setStyle(ButtonStyle.Primary);

    const ticketRow = new ActionRowBuilder().addComponents(ticketButton);

    await ticketChannel.send({
        embeds: [ticketEmbed],
        components: [ticketRow]
    });

    console.log('✅ Panels sent');
});

// ================= CHECK IF USER HAS TICKET =================
async function userHasTicket(guild, userId) {
    const channels = await guild.channels.fetch();

    return channels.some(ch =>
        ch &&
        ch.name &&
        ch.name.startsWith('ticket-') &&
        ch.permissionOverwrites.cache?.some(po => po.id === userId)
    );
}

// ================= GET NEXT TICKET NUMBER =================
async function getNextTicketNumber(guild) {
    const channels = await guild.channels.fetch();
    let max = 0;

    channels.forEach(ch => {
        if (ch && ch.name && ch.name.startsWith('ticket-')) {
            const num = parseInt(ch.name.split('-')[1]);
            if (!isNaN(num) && num > max) max = num;
        }
    });

    return max + 1;
}

// ================= INTERACTIONS =================
client.on(Events.InteractionCreate, async interaction => {

    // ================= VERIFY =================
    if (interaction.isButton() && interaction.customId === 'verify_button') {

        const role = interaction.guild.roles.cache.get(VERIFY_ROLE_ID);

        await interaction.member.roles.add(role);

        return interaction.reply({
            content: '✅ Verified!',
            ephemeral: true
        });
    }

    // ================= OPEN TICKET =================
    if (interaction.isButton() && interaction.customId === 'open_ticket') {

        const guild = interaction.guild;
        const userId = interaction.user.id;

        const hasTicket = await userHasTicket(guild, userId);

        if (hasTicket) {
            return interaction.reply({
                content: '❌ You already have an open ticket!',
                ephemeral: true
            });
        }

        const ticketNumber = await getNextTicketNumber(guild);

        const channel = await guild.channels.create({
            name: `ticket-${ticketNumber}`,
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

        // ✅ UPDATED TICKET MESSAGE TEXT
        const embed = new EmbedBuilder()
            .setColor('#ff6600')
            .setTitle(`🛒 Purchase Ticket #${ticketNumber}`)
            .setDescription(
                '👋 Ačiū, kad susikūrei užsakymą!\n\n' +
                '📦 Parašyk ką nori pirkti arba kokio produkto ieškai.\n' +
                '💬 Galime padėti su kainomis, kiekiais ir pasirinkimu.\n\n' +
                '🔥 Kuo daugiau informacijos pateiksi, tuo greičiau padėsime.'
            );

        const closeBtn = new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('Close Ticket')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(closeBtn);

        await channel.send({
            content: `<@${userId}>`,
            embeds: [embed],
            components: [row]
        });

        return interaction.reply({
            content: `✅ Ticket created: ${channel}`,
            ephemeral: true
        });
    }

    // ================= CLOSE TICKET =================
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
