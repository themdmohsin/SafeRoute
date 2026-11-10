import ContactMessage from '../models/ContactMessage.js';

export async function createContactMessage(req, res) {
  const { name, email, message } = req.body || {};

  if (!name || !email || !message) {
    return res.status(400).json({ message: 'Name, email, and message are required.' });
  }

  const trimmedName = String(name).trim();
  const trimmedEmail = String(email).trim();
  const trimmedMessage = String(message).trim();

  if (!trimmedName || !trimmedMessage) {
    return res.status(400).json({ message: 'Name and message are required.' });
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(trimmedEmail)) {
    return res.status(400).json({ message: 'Enter a valid email address.' });
  }

  try {
    const contactMessage = await ContactMessage.create({
      name: trimmedName,
      email: trimmedEmail,
      message: trimmedMessage,
      source: 'landing-page',
    });

    return res.status(201).json({
      id: contactMessage.id,
      message: 'Your message has been received. We will follow up soon.',
    });
  } catch (error) {
    console.error('Contact message creation failed:', error.message);
    return res.status(500).json({ message: 'Unable to send your message right now.' });
  }
}
