package ec.edu.uleam.laboratorios;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import androidx.core.splashscreen.SplashScreen;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    SplashScreen.installSplashScreen(this);
    super.onCreate(savedInstanceState);
  }
}
