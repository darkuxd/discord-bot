require('dotenv').config();

const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Events
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

const VERIFY_CHANNEL_ID = '1515833574639669388';
const VERIFY_ROLE_ID = '1515831883425124412';

client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);

    const channel = await client.channels.fetch(VERIFY_CHANNEL_ID);

    if (!channel) {
        console.log('❌ Verify channel not found');
        return;
    }

    const embed = new EmbedBuilder()
        .setColor('#00bfff')
        .setTitle('🔐 Patvirtinimas / Verification')
        .setDescription(
            'Norėdami gauti prieigą prie serverio, paspauskite mygtuką žemiau.\n\n' +
            'To access the server, please click the button below to verify yourself.'
        )
        .setFooter({ text: 'Reselling Kingdom Verification System' });

    const button = new ButtonBuilder()
        .setCustomId('verify_button')
        .setLabel('Verify')
        .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(button);

    await channel.send({
        embeds: [embed],
        components: [row]
    });

    console.log('✅ Verification embed sent');
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'verify_button') {

        const role = interaction.guild.roles.cache.get(VERIFY_ROLE_ID);

        if (!role) {
            return interaction.reply({
                content: '❌ Role not found.',
                ephemeral: true
            });
        }

        const member = interaction.member;

        if (member.roles.cache.has(VERIFY_ROLE_ID)) {
            return interaction.reply({
                content: '✅ You are already verified.',
                ephemeral: true
            });
        }

        try {
            await member.roles.add(role);

            await interaction.reply({
                content: '✅ You have been verified!',
                ephemeral: true
            });
        } catch (err) {
            console.error(err);

            await interaction.reply({
                content: '❌ Failed to give role.',
                ephemeral: true
            });
        }
    }
});

client.login(process.env.TOKEN);