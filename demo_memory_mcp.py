import subprocess
import json
import sys
import time

def run_mcp_server():
    """Run the MCP memory server and demonstrate its capabilities."""
    try:
        # Start the MCP server process with pipes
        process = subprocess.Popen(
            'npx -y @modelcontextprotocol/server-memory',
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            shell=True
        )

        if process.stdin is None or process.stdout is None:
            print("Failed to open stdin or stdout for the MCP server process.")
            return False

        def send_request(req):
            process.stdin.write(json.dumps(req) + '\n')
            process.stdin.flush()

        def read_response():
            line = process.stdout.readline()
            if line:
                return json.loads(line.strip())
            return None

        # Initialize the server
        init_request = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {
                    "name": "demo-client",
                    "version": "1.0.0"
                }
            }
        }

        send_request(init_request)
        response = read_response()
        print("Server initialized:", response)

        # Send initialized notification
        initialized_notification = {
            "jsonrpc": "2.0",
            "method": "notifications/initialized"
        }
        send_request(initialized_notification)

        # Demonstrate create_entities tool
        create_entities_request = {
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/call",
            "params": {
                "name": "create_entities",
                "arguments": {
                    "entities": [
                        {
                            "name": "John_Doe",
                            "entityType": "person",
                            "observations": ["Speaks fluent English", "Works in tech"]
                        },
                        {
                            "name": "OpenAI",
                            "entityType": "organization",
                            "observations": ["AI research company", "Founded in 2015"]
                        }
                    ]
                }
            }
        }

        print("\nDemonstrating create_entities tool...")
        send_request(create_entities_request)
        response = read_response()
        print("Create entities response:", response)

        # Demonstrate create_relations tool
        create_relations_request = {
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/call",
            "params": {
                "name": "create_relations",
                "arguments": {
                    "relations": [
                        {
                            "from": "John_Doe",
                            "to": "OpenAI",
                            "relationType": "works_at"
                        }
                    ]
                }
            }
        }

        print("\nDemonstrating create_relations tool...")
        send_request(create_relations_request)
        response = read_response()
        print("Create relations response:", response)

        # Demonstrate read_graph tool
        read_graph_request = {
            "jsonrpc": "2.0",
            "id": 4,
            "method": "tools/call",
            "params": {
                "name": "read_graph"
            }
        }

        print("\nDemonstrating read_graph tool...")
        send_request(read_graph_request)
        response = read_response()
        print("Read graph response:", json.dumps(response, indent=2))

        # Clean up
        process.terminate()
        process.wait()

    except Exception as e:
        print(f"Error running MCP server: {e}")
        return False

    return True

if __name__ == "__main__":
    print("Setting up and demonstrating MCP Memory Server...")
    success = run_mcp_server()
    if success:
        print("\nMCP Memory Server demonstration completed successfully!")
    else:
        print("\nFailed to demonstrate MCP Memory Server.")
