import ChatArea from "../../components/ChatArea"

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <ChatArea chatId={id} />
}
