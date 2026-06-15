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

const TICKET_PANEL_CHANNEL_ID = '1515828291695673405'; // 👈 NEW CHANNEL FOR TICKET EMBED
const TICKET_CATEGORY_ID = '1516043869257597023';

const SUPPORT_ROLE_1 = '1515830402491879584';
const SUPPORT_ROLE_2 = '1515824249871270051';

// ===== READY =====
client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);

    // =========================
    // VERIFY PANEL
    // =========================
    const verifyChannel = await client.channels.fetch(VERIFY_CHANNEL_ID);

    const verifyEmbed = new EmbedBuilder()
        .setColor('#00bfff')
        .setTitle('🔐 Verification')
        .setDescription('Spausk mygtuką žemiau, kad gautum prieigą prie serverio.');

    const verifyButton = new ButtonBuilder()
        .setCustomId('verify_button')
        .setLabel('Verify')
        .setStyle(ButtonStyle.Success);

    const ticketButton = new ButtonBuilder()
        .setCustomId('open_ticket')
        .setLabel('Open Ticket')
        .setStyle(ButtonStyle.Primary);

    const verifyRow = new ActionRowBuilder().addComponents(verifyButton);

    await verifyChannel.send({
        embeds: [verifyEmbed],
        components: [verifyRow]
    });

    // =========================
    // TICKET PANEL (NEW CHANNEL)
    // =========================
    const ticketChannel = await client.channels.fetch(TICKET_PANEL_CHANNEL_ID);

    const ticketEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('🎫 Support Tickets')
        .setDescription('Jei reikia pagalbos, spausk mygtuką žemiau ir sukurk ticket.');

    const ticketRow = new ActionRowBuilder().addComponents(ticketButton);

    await ticketChannel.send({
        embeds: [ticketEmbed],
        components: [ticketRow]
    });

    console.log('✅ Panels sent');
});

// ===== GET NEXT TICKET NUMBER =====
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

// ===== INTERACTIONS =====
client.on(Events.InteractionCreate, async interaction => {

    // =========================
    // VERIFY
    // =========================
    if (interaction.isButton() && interaction.customId === 'verify_button') {

        const role = interaction.guild.roles.cache.get(VERIFY_ROLE_ID);

        if (!role) {
            return interaction.reply({ content: 'Role not found.', ephemeral: true });
        }

        if (interaction.member.roles.cache.has(VERIFY_ROLE_ID)) {
            return interaction.reply({ content: 'Jau verified.', ephemeral: true });
        }

        await interaction.member.roles.add(role);

        return interaction.reply({
            content: '✅ You are verified!',
            ephemeral: true
        });
    }

    // =========================
    // OPEN TICKET
    // =========================
    if (interaction.isButton() && interaction.customId === 'open_ticket') {

        const guild = interaction.guild;
        const user = interaction.user;

        const ticketNumber = await getNextTicketNumber(guild);
        const channelName = `ticket-${ticketNumber}`;

        const channel = await guild.channels.create({
            name: channelName,
            type: 0,
            parent: TICKET_CATEGORY_ID,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel]
                },
                {
                    id: user.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory
                    ]
                },
                {
                    id: SUPPORT_ROLE_1,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory
                    ]
                },
                {
                    id: SUPPORT_ROLE_2,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory
                    ]
                }
            ]
        });

        const ticketEmbed = new EmbedBuilder()
            .setColor('Red')
            .setTitle(`🎫 Ticket #${ticketNumber}`)
            .setDescription('Parašyk savo problemą čia. Support komanda greitai atsakys.');

        const closeButton = new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('Uždaryti / Close')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(closeButton);

        await channel.send({
            content: `<@${user.id}>`,
            embeds: [ticketEmbed],
            components: [row]
        });

        return interaction.reply({
            content: `🎫 Ticket created: ${channel}`,
            ephemeral: true
        });
    }

    // =========================
    // CLOSE TICKET
    // =========================
    if (interaction.isButton() && interaction.customId === 'close_ticket') {

        const channel = interaction.channel;

        await interaction.reply({
            content: '🔒 Ticket closing...',
            ephemeral: true
        });

        setTimeout(async () => {
            await channel.delete().catch(() => {});
        }, 2000);
    }
});

client.login(process.env.TOKEN);
