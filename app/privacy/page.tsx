import type { Metadata } from "next";
import { ContactLine, Fact, LegalPage } from "@/components/LegalPage";
import { getShop } from "@/lib/shop";
import { shopFacts } from "@/lib/shop-facts";

// Describes what the site actually does (D-046). If the code changes how data is handled, this page changes with it.
export const revalidate = false;

export const metadata: Metadata = {
  title: "Privacy | Thriftesque",
  description: "What the Thriftesque website stores, what goes to WhatsApp when you order, and who helps us run the site.",
  alternates: { canonical: "/privacy" },
};

export default async function PrivacyPage() {
  const { settings } = await getShop();
  const facts = shopFacts(settings.details);
  return (
    <LegalPage title="Privacy">
      <p>
        This page explains what happens to your information when you use this website and order from us. Who we are:{" "}
        <Fact fact={facts.operator} />.
      </p>

      <h2 className="display">The short version</h2>
      <ul>
        <li>You don&apos;t need an account to shop, and we don&apos;t ask for one.</li>
        <li>Your bag is saved in your own browser, not on our servers.</li>
        <li>Nothing is sent to us until you press send in WhatsApp.</li>
        <li>No analytics, no advertising and no tracking cookies.</li>
      </ul>

      <h2 className="display">Your bag</h2>
      <p>
        The pieces in your bag, and the name, area and delivery choice you type there, are kept in your browser&apos;s
        storage on your device so your bag is still there when you come back. They aren&apos;t sent anywhere while you
        browse. To remove them, empty your bag or clear this site&apos;s data in your browser settings.
      </p>

      <h2 className="display">When you order</h2>
      <p>
        &quot;Send order on WhatsApp&quot; opens WhatsApp with a message we prepare for you: the pieces, their codes and
        prices, the delivery fee and total, your name and your area or pickup. You can read and change it, and it&apos;s only
        sent when you press send. From then on the conversation is on WhatsApp, which is run by Meta under its own privacy
        policy.
      </p>
      <p>
        We use what you send us to confirm your order, arrange delivery or pickup and answer your questions.
        {facts.orderRetention.text && <> We keep it for {facts.orderRetention.text}.</>}
      </p>

      <h2 className="display">Cookies</h2>
      <p>
        Shoppers get no cookies from this site. Our team&apos;s sign-in uses cookies on the team pages only, to keep them
        signed in.
      </p>

      <h2 className="display">Who helps us run the site</h2>
      <ul>
        <li>
          <strong>Cloudflare</strong> hosts the site and protects it from attacks. Like any web server it sees your IP address
          and the pages you request, and keeps short-lived logs (a few days) to run the service and fix problems.
        </li>
        <li>
          <strong>Supabase</strong> stores the product catalogue and photos, on servers in Mumbai, India. It doesn&apos;t
          receive anything about shoppers.
        </li>
        <li>
          <strong>Google Gemini</strong> helps our team write product descriptions from product photos. It only ever sees
          photos of clothes and product details, never anything about you.
        </li>
        <li>
          <strong>WhatsApp (Meta)</strong> carries your order messages, as described above.
        </li>
      </ul>
      <p>We don&apos;t sell your information or share it with anyone else.</p>

      <h2 className="display">Your rights</h2>
      <p>
        Under Qatar&apos;s personal data protection law (Law No. 13 of 2016) you can ask what information we hold about you,
        ask us to correct it, or ask us to delete it. <ContactLine whatsappNumber={settings.whatsappNumber} email={facts.contactEmail} />
      </p>

      <h2 className="display">Changes</h2>
      <p>If we change how the site handles information, we update this page and the date at the top.</p>
    </LegalPage>
  );
}
