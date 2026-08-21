import { getPrisma, disconnectPrisma } from '../src/common/prisma.js'

async function main() {
  const prisma = getPrisma()
  
  // 检查口语题的 explanation
  const speakQs = await prisma.contentQuestion.findMany({
    where: { content: { bookId: 'toefl-power-toefl-speaking' } },
    select: { id: true, explanation: true, answer: true },
    take: 5,
  })
  for (const q of speakQs) {
    console.log('id=' + q.id)
    console.log('  explanation=' + (q.explanation ? 'Y(' + q.explanation.substring(0, 60) + ')' : 'NULL'))
    console.log('  answer=' + (q.answer ? 'Y(' + JSON.stringify(q.answer).substring(0, 60) + ')' : 'null'))
  }

  // 直接查 Supabase API 看 scoring_rubric 是否有值
  const jsRes = await fetch('https://power-toefl.com/assets/index-5RdqfUC4.js')
  const js = await jsRes.text()
  const keyMatch = js.match(/(eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/)
  const apiKey = keyMatch![1]

  const prompts = await fetch(
    'https://tenayihnqaqwslswfrnn.supabase.co/rest/v1/speaking_prompts?select=id,scoring_rubric,sample_response,prompt_text&is_published=eq.true&limit=3',
    { headers: { apikey: apiKey, Authorization: 'Bearer ' + apiKey, Accept: 'application/json' } },
  ).then(r => r.json())

  console.log('\n=== Supabase speaking_prompts ===')
  for (const p of prompts) {
    console.log('id=' + p.id)
    console.log('  scoring_rubric=' + (p.scoring_rubric ? 'Y(' + p.scoring_rubric.substring(0, 80) + ')' : 'NULL'))
    console.log('  sample_response=' + (p.sample_response ? 'Y(' + p.sample_response.substring(0, 80) + ')' : 'NULL'))
  }

  await disconnectPrisma()
}

main().catch(console.error)
