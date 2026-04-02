require 'httpx'
require 'dry-struct'

module LLMGateway
  class Error < StandardError
    attr_reader :status_code

    def initialize(message, status_code = nil)
      super(message)
      @status_code = status_code
    end
  end

  class RateLimitError < Error; end
  class AuthenticationError < Error; end

  class Client
    attr_reader :base_url, :api_key, :admin_token, :timeout, :max_retries

    def initialize(base_url: 'http://localhost:3000', api_key: nil, admin_token: nil, timeout: 60, max_retries: 3)
      @base_url = base_url
      @api_key = api_key
      @admin_token = admin_token
      @timeout = timeout
      @max_retries = max_retries
      @client = HTTPX.timeout(timeout)
    end

    def headers(admin: false)
      h = { 'Content-Type' => 'application/json' }
      h['Authorization'] = "Bearer #{admin ? admin_token : api_key}" if (admin ? admin_token : api_key)
      h
    end

    def request(method, path, admin: false, **opts)
      url = "#{base_url}#{path}"
      response = @client.request(method, url, headers: headers(admin), **opts)

      case response.status
      when 429
        raise RateLimitError.new('Rate limit exceeded', 429)
      when 401
        raise AuthenticationError.new('Invalid API key', 401)
      when 400..599
        raise Error.new("Request failed: #{response.body}", response.status)
      end

      JSON.parse(response.body) unless response.body.empty?
    end

    def chat
      ChatCompletions.new(self)
    end

    def models
      Models.new(self)
    end

    def embeddings
      Embeddings.new(self)
    end

    def messages
      Messages.new(self)
    end

    def admin
      Admin.new(self)
    end
  end

  class ChatCompletions
    def initialize(client)
      @client = client
    end

    def create(model:, messages:, **opts)
      @client.request(:post, '/v1/chat/completions', json: { model: model, messages: messages }.merge(opts))
    end

    def create_stream(model:, messages:, **opts, &block)
      # Streaming implementation
      create(model: model, messages: messages, stream: true, **opts)
    end
  end

  class Models
    def initialize(client)
      @client = client
    end

    def list
      @client.request(:get, '/v1/models')
    end

    def retrieve(model_id)
      @client.request(:get, "/v1/models/#{model_id}")
    end
  end

  class Embeddings
    def initialize(client)
      @client = client
    end

    def create(model:, input:, **opts)
      @client.request(:post, '/v1/embeddings', json: { model: model, input: input }.merge(opts))
    end
  end

  class Messages
    def initialize(client)
      @client = client
    end

    def create(model:, messages:, **opts)
      @client.request(:post, '/v1/messages', json: { model: model, messages: messages }.merge(opts))
    end
  end

  class Admin
    def initialize(client)
      @client = client
    end

    def health
      @client.request(:get, '/admin/health')
    end

    def keys
      AdminKeys.new(@client)
    end

    def orgs
      AdminOrgs.new(@client)
    end

    def teams
      AdminTeams.new(@client)
    end

    def stats
      @client.request(:get, '/admin/stats', admin: true)
    end
  end

  class AdminKeys
    def initialize(client)
      @client = client
    end

    def list
      @client.request(:get, '/admin/keys', admin: true)
    end

    def create(**opts)
      @client.request(:post, '/admin/keys', admin: true, json: opts)
    end

    def delete(key_id)
      @client.request(:delete, "/admin/keys/#{key_id}", admin: true)
    end
  end

  class AdminOrgs
    def initialize(client)
      @client = client
    end

    def list
      @client.request(:get, '/admin/orgs', admin: true)
    end

    def create(**opts)
      @client.request(:post, '/admin/orgs', admin: true, json: opts)
    end
  end

  class AdminTeams
    def initialize(client)
      @client = client
    end

    def list
      @client.request(:get, '/admin/teams', admin: true)
    end

    def create(**opts)
      @client.request(:post, '/admin/teams', admin: true, json: opts)
    end
  end

  class AdminHealth
    def initialize(client)
      @client = client
    end

    def providers
      @client.request(:get, '/admin/health/providers', admin: true)
    end
  end

  # Module-level convenience methods
  def self.new(**opts)
    Client.new(**opts)
  end
end