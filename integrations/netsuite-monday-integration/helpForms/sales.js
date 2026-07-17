const SALES_BOARD_ID = '2428283337';
const SALES_GROUP_ID = 'emailed_items';

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validateSalesInquiry(input = {}) {
  const raw = input && typeof input === 'object' ? input : {};
  if (clean(raw.website)) {
    return { ok: false, bot: true, errors: {} };
  }

  const value = {
    name: clean(raw.name),
    email: clean(raw.email).toLowerCase(),
    phone: clean(raw.phone).replace(/[^0-9]/g, ''),
    itemSku: clean(raw.itemSku),
    question: clean(raw.question),
  };
  const errors = {};

  if (!value.name) errors.name = 'Enter your name.';
  else if (value.name.length > 255) errors.name = 'Name must be 255 characters or fewer.';

  if (!value.email) errors.email = 'Enter your email address.';
  else if (value.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!value.phone) errors.phone = 'Enter your phone number.';
  else if (value.phone.length < 10 || value.phone.length > 15) errors.phone = 'Enter a valid phone number.';

  if (value.itemSku.length > 255) errors.itemSku = 'Item or SKU must be 255 characters or fewer.';

  if (!value.question) errors.question = 'Tell us how we can help.';
  else if (value.question.length > 2000) errors.question = 'Question must be 2,000 characters or fewer.';

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}

function toMondayItem(value, now = new Date()) {
  const columnValues = {
    label1: { index: 102 },
    email: { email: value.email, text: value.email },
    phone: { phone: value.phone, countryShortName: 'US' },
    long_text8: { text: value.question },
    date85: { date: now.toISOString().slice(0, 10) },
  };

  if (value.itemSku) {
    columnValues.long_text_mm0btcjw = { text: value.itemSku };
  }

  return {
    boardId: SALES_BOARD_ID,
    groupId: SALES_GROUP_ID,
    itemName: value.name,
    columnValues,
  };
}

module.exports = { validateSalesInquiry, toMondayItem };
