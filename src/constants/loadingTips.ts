/** Short hints shown on table loading screens — see docs/loading-did-you-know-tips.md */
export const LOADING_DID_YOU_KNOW_TIPS: string[] = [
	// Country Music Facts
	"Country music was originally marketed as 'hillbilly music' until the 1940s when the term 'country' was finally popularized.",
	"The U.S. Congress formally recognized Bristol, Tennessee, as the 'Birthplace of Country Music' due to historic 1927 recording sessions.",
	"The banjo, an instrument heavily featured in early and modern country music, actually has African roots.",
	"The Grand Ole Opry is the world's longest-running radio show, broadcasting live from Nashville since 1925.",
	"Fiddlin' John Carson recorded what is widely considered the first commercial country song with vocals and lyrics back in 1923.",
	"The 'singing cowboys' of 1930s Hollywood films, like Gene Autry, massively popularized western and country music nationwide.",
	"Bob Wills was one of the first country musicians to innovate the genre by adding an electric guitar to his band in 1938.",
	"The signature 'twang' of country music was heavily influenced by Hawaiian steel guitar traditions.",
	"Jimmie Rodgers is often referred to as the 'Father of Country Music,' famous for his signature yodeling blues.",
	"The Country Music Hall of Fame and Museum in Nashville preserves a massive archive of nearly 200,000 sound recordings.",
	"The 'Outlaw Country' movement of the 1970s was actually a rebellion by artists like Willie Nelson against slick, overproduced studio tracks.",
	
	// Dolly Parton Facts
	"Dolly Parton famously wrote two of country music's biggest and most enduring hits, 'Jolene' and 'I Will Always Love You,' on the exact same day in 1973.",
	"Beyond her iconic music career, Dolly Parton's 'Imagination Library' foundation has mailed over 200 million free books to children worldwide.",
	
	// Dasha Fact
	"Rising country pop star Dasha's breakout hit 'Austin' exploded onto the Billboard charts after she choreographed a viral line-dance for it on TikTok.",
	
	// Shaboozey Fact
	"In 2024, Shaboozey made history as the first Black male artist to top both the Billboard Hot 100 and the Hot Country Songs charts simultaneously with his smash hit 'A Bar Song (Tipsy)'.",
  
	// Event Management Facts
	"Event Management is consistently ranked among the top 5 most stressful jobs globally, right alongside enlisted military personnel and firefighters.",
	"Being an Event Manager requires elite 'stress tolerance,' demanding professionals to master 8 of the 11 recognized psychological workplace stress factors.",
	"Event Operations is a highly skilled balancing act, requiring teams to flawlessly manage complex A/V setups, VIP demands, and crisis contingencies simultaneously.",
	"Despite regular 12-to-16-hour workdays, top Event Managers are master problem-solvers who must remain calm, diplomatic, and effective when things go wrong behind the scenes.",
	"The sheer stamina required to execute large-scale events is immense, with over 80% of event managers pulling sleepless nights just to ensure the attendee experience appears effortless."
  ];

export function getRandomLoadingTip(
	tips: readonly string[] = LOADING_DID_YOU_KNOW_TIPS,
): string | null {
	if (tips.length === 0) {
		return null;
	}

	const index = Math.floor(Math.random() * tips.length);
	return tips[index] ?? null;
}
