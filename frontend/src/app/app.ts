import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DashboardLayoutService } from './services/dashboard-layout.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  readonly layoutService = inject(DashboardLayoutService);

  readonly currentTime = signal<string>('');
  readonly currentDate = signal<string>('');
  private timerInterval?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.updateTime();
    this.timerInterval = setInterval(() => this.updateTime(), 1000);
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  private updateTime(): void {
    const now = new Date();
    this.currentTime.set(
      now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    );
    this.currentDate.set(
      now.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' })
    );
  }
}

