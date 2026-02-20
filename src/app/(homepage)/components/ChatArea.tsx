interface Props {
  chatId?: string
}

const ChatArea = ({ chatId }: Props) => {
  if (!chatId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-zinc-500">
          Select a chat to start messaging
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      
      {/* HEADER */}
      <div className="h-16 border-b border-zinc-800 flex items-center px-6">
        Chat with {chatId}
      </div>

      {/* MESSAGES AREA */}
      <div className="flex-1 p-6">
        Messages will go here
      </div>

      {/* INPUT */}
      <div className="h-20 border-t border-zinc-800 flex items-center px-6">
        Message input
      </div>

    </div>
  )
}

export default ChatArea