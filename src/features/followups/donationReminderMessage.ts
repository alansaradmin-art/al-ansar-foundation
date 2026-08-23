/** The fixed donation-reminder template a manager sends via WhatsApp from
 * the Follow-up section — {{member_name}}/{{manager_name}} are the only
 * two variables, substituted directly rather than through a generic
 * templating mechanism since there's nothing else to parametrize. */
export function buildDonationReminderMessage(memberName: string, managerName: string): string {
  return `Assalamu Alaikum ${memberName} Bhai,

Umeed hai aap khairiyat se honge. Main ${managerName} aapse Al Ansar Foundation, Hatwa Bazar ke is mahine ke donation ke silsile mein ek chhoti si guzarish karna chahta hoon.

Agar aapne abhi tak is mahine ka donation nahi kiya hai, to apni sahulat ke mutabiq zaroor contribute karein. Aapka ta'awun Foundation ke kaam aur zaruratmand logon ki madad mein bahut aham hai. 🤲

Agar aap is mahine ka donation already kar chuke hain, to barah-e-karam is message ko ignore karein.

JazakAllahu Khairan 🤲
${managerName}
Al Ansar Foundation, Hatwa Bazar`
}
