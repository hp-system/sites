// ═══════════════════════════════════════════════════════════════════════════
// ΑΠΟΣΥΝΔΕΣΗ — σβήνει το cookie ΚΑΙ ενημερώνει το EALIDA.
//
// 🪤 ΔΕΝ ΑΡΚΕΙ ΝΑ ΣΒΗΣΕΙ ΤΟ COOKIE. Το εισιτήριο ζει 30 μέρες και παραμένει
//    έγκυρο: όποιος το έχει αντιγράψει μπαίνει ξανά. Γι' αυτό ειδοποιούμε και τον
//    διακομιστή — εκεί υπάρχει το `member_sessions_valid_from` που το ακυρώνει.
//    Αν η κλήση αποτύχει, σβήνουμε το cookie ούτως ή άλλως: ο χρήστης ζήτησε να
//    βγει και πρέπει να βγει, έστω τοπικά.
//
// 📮 POST, ΟΧΙ GET. Ένα `<a href="/logout">` θα το πατούσε ο προ-φορτωτής του
//    φυλλομετρητή ή ένας σαρωτής, και ο πελάτης θα έβγαινε μόνος του.
// ═══════════════════════════════════════════════════════════════════════════
import type { APIRoute } from 'astro';
import { forwardIp } from '../../../lib/clientip';
import { isHttps } from '../../../lib/origin';

export const prerender = false;

const API = import.meta.env.EALIDA_API || process.env.EALIDA_API || 'http://localhost:3020/api';

export const POST: APIRoute = async ({ request, url, cookies, redirect, clientAddress }) => {
  const token = cookies.get('member_token')?.value;

  if (token) {
    try {
      await fetch(`${API}/site/member/logout`, {
        method: 'POST',
        headers: {
          'x-member-token': token, 'content-type': 'application/json',
          ...forwardIp(request, clientAddress),   // για το μητρώο συνεδριών
        },
        signal: AbortSignal.timeout(5000),
      });
    } catch { /* το cookie φεύγει έτσι κι αλλιώς — δες το σχόλιο πάνω */ }
  }

  // Same attributes as when it was set (B-05), so the browser matches and removes it.
  cookies.delete('member_token', { path: '/', httpOnly: true, sameSite: 'lax', secure: isHttps(request, url) });
  return redirect('/', 303);
};
