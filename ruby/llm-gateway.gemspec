Gem::Specification.new do |spec|
  spec.name          = 'llm-gateway'
  spec.version       = '1.0.0'
  spec.summary       = 'Ruby SDK for LLM Gateway - multi-provider LLM gateway'
  spec.description   = 'A Ruby client library for LLM Gateway - production-grade multi-provider LLM gateway with enterprise features'
  spec.homepage      = 'https://github.com/big-llm/llm-gateway'
  spec.license       = 'MIT'
  spec.author        = 'Dikshant Gajera'
  spec.email         = 'dikshantgajera@gmail.com'

  spec.files         = Dir['lib/**/*.rb', 'README.md', 'LICENSE']
  spec.require_paths = ['lib']

  spec.required_ruby_version = '>= 2.7'

  spec.add_runtime_dependency 'httpx', '~> 0.25'
  spec.add_runtime_dependency 'dry-struct', '~> 1.5'

  spec.add_development_dependency 'rspec', '~> 3.12'
  spec.add_development_dependency 'webmock', '~> 3.18'

  spec.metadata = {
    'bug_tracker_uri' => 'https://github.com/big-llm/llm-gateway/issues',
    'source_code_uri' => 'https://github.com/big-llm/llm-gateway',
    'changelog_uri' => 'https://github.com/big-llm/llm-gateway/blob/main/ruby/CHANGELOG.md'
  }

  spec.categories = [
    'Software Development',
    'Libraries',
    'Ruby Gems',
    'AI'
  ]

  spec.tags = %w[
    llm
    gateway
    openai
    anthropic
    api
    client
  ]
end