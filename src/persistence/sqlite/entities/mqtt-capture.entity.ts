import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'mqtt_captures' })
export class MqttCaptureEntity {
  /** The full topic is the identity — it already encodes the channel. */
  @PrimaryColumn({ type: 'text', name: 'topic' })
  topic!: string;

  @Index('idx_mqtt_captures_channel')
  @Column({ type: 'text', name: 'channel', nullable: true })
  channel!: string | null;

  @CreateDateColumn({ type: 'datetime', name: 'first_seen_at' })
  firstSeenAt!: Date;

  @Index('idx_mqtt_captures_last_seen_at')
  @Column({ type: 'datetime', name: 'last_seen_at' })
  lastSeenAt!: Date;
}
