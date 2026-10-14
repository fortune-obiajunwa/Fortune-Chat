import { conversations } from "../data/conversations";

function ChatShell() {
  return (
    <div className="chat-shell">
      {/* Sidebar */}
      <aside className="chat-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="brand-icon">FC</div>

            <div>
              <h2>Fortune Chat</h2>
              <span>Messages</span>
            </div>
          </div>

          <button
            className="icon-button"
            aria-label="More options"
          >
            ⋮
          </button>
        </div>

        {/* Search */}
        <div className="search-box">
          <span className="search-icon">⌕</span>

          <input
            type="text"
            placeholder="Search conversations"
          />
        </div>

        {/* Conversation heading */}
        <div className="conversation-heading">
          <span>Messages</span>

          <button
            className="new-chat-button"
            aria-label="Start new chat"
          >
            +
          </button>
        </div>

        {/* Conversation List */}
        <div className="conversation-list">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              className="conversation-item"
            >
              <div className="conversation-avatar">
                {conversation.name.charAt(0).toUpperCase()}
              </div>

              <div className="conversation-content">
                <div className="conversation-top">
                  <h3>{conversation.name}</h3>

                  <span>{conversation.time}</span>
                </div>

                <p>{conversation.lastMessage}</p>
              </div>

              {conversation.isOnline && (
                <span
                  className="online-dot"
                  aria-label="Online"
                />
              )}
            </button>
          ))}
        </div>
      </aside>

      {/* Main chat area */}
      <main className="chat-main">
        <div className="chat-welcome">
          <div className="chat-welcome__icon">
            FC
          </div>

          <h1>Welcome to Fortune Chat</h1>

          <p>
            Select a conversation from the sidebar
            or start a new chat to begin messaging.
          </p>

          <button className="start-chat-button">
            Start a new chat
          </button>
        </div>
      </main>
    </div>
  );
}

export default ChatShell;