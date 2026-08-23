/** The three fixed WhatsApp templates for the Follow-up section — one per
 * recipient (the member directly, their Added By, or their Reference
 * Contact). Variables are substituted directly rather than through a
 * generic templating mechanism since each template has a small, fixed set
 * of them. */
export function buildDonationReminderMessage(memberName: string, managerName: string): string {
  return `Assalamu Alaikum ${memberName} Bhai,

Umeed hai aap khairiyat se honge. Main ${managerName} aapse Al Ansar Foundation, Hatwa Bazar ke is mahine ke donation ke silsile mein ek chhoti si guzarish karna chahta hoon.

Agar aapne abhi tak is mahine ka donation nahi kiya hai, to apni sahulat ke mutabiq zaroor contribute karein. Aapka ta'awun Foundation ke kaam aur zaruratmand logon ki madad mein bahut aham hai. 🤲

Agar aap is mahine ka donation already kar chuke hain, to barah-e-karam is message ko ignore karein.

JazakAllahu Khairan 🤲
${managerName}
Al Ansar Foundation, Hatwa Bazar`
}

export function buildAddedByReminderMessage(memberName: string, addedByName: string, managerName: string): string {
  return `Assalamu Alaikum ${addedByName} Bhai,

Umeed hai aap khairiyat se honge. Main ${managerName} Al Ansar Foundation, Hatwa Bazar ki taraf se aapse rabta kar raha hoon regarding ${memberName}.

Agar mumkin ho to barah-e-karam unse is mahine ke donation ke silsile mein baat kar dein aur apni sahulat ke mutabiq contribution karne ke liye yaad dila dein.

Aapke ta'awun ka bahut shukriya. 🤲

JazakAllahu Khairan
${managerName}
Al Ansar Foundation, Hatwa Bazar`
}

export function buildReferenceContactReminderMessage(
  memberName: string,
  referenceName: string,
  managerName: string,
): string {
  return `Assalamu Alaikum ${referenceName} Bhai,

Umeed hai aap khairiyat se honge. Main ${managerName} Al Ansar Foundation, Hatwa Bazar ki taraf se aapse rabta kar raha hoon regarding ${memberName}, jinke reference mein aapka naam diya gaya hai.

Agar mumkin ho to barah-e-karam unse is mahine ke donation ke silsile mein baat kar dein aur apni sahulat ke mutabiq contribution karne ke liye yaad dila dein.

Aapke ta'awun ka bahut shukriya. 🤲

JazakAllahu Khairan
${managerName}
Al Ansar Foundation, Hatwa Bazar`
}
